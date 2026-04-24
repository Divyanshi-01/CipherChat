/**
 * WebSocket Client for P2P Messaging
 * Handles connection, messaging, and real-time updates
 */

class WebSocketClient {
    constructor(config = {}) {
        this.config = {
           wsUrl: config.wsUrl || 'https://cipherchat-backend.onrender.com/ws',
            reconnectInterval: config.reconnectInterval || 5000,
            reconnectAttempts: config.reconnectAttempts || 10,
            ...config
        };

        this.stompClient = null;
        this.connected = false;
        this.userId = null;
        this.reconnectAttemptCount = 0;
        this.subscriptions = new Map();
        this.eventHandlers = new Map();

        this.initializeStomp();
    }

    /**
     * Initialize STOMP client
     */
    initializeStomp() {
        // Check if SockJS is loaded
        if (typeof SockJS === 'undefined') {
            console.error('SockJS not loaded. Please include SockJS library.');
            return;
        }

        // Check if STOMP is loaded
        if (typeof Stomp === 'undefined') {
            console.error('STOMP not loaded. Please include STOMP library.');
            return;
        }

        const socket = new SockJS(this.config.wsUrl);
        this.stompClient = Stomp.over(socket);

        // Disable debug logging in production
        this.stompClient.debug = (str) => {
            // Uncomment for debugging:
            // console.log('[STOMP Debug]:', str);
        };

        console.log('WebSocket client initialized');
    }

    /**
     * Connect to WebSocket server
     * @param {string} userId - User ID
     * @param {Function} onConnect - Callback when connected
     * @param {Function} onError - Error callback
     */
    connect(userId, onConnect = null, onError = null) {
        if (this.connected) {
            console.warn('Already connected');
            return;
        }

        this.userId = userId;

        const headers = {
            'X-User-ID': userId,
            'login': userId,
            'passcode': 'password'
        };

        this.stompClient.connect(
            headers,
            (frame) => {
                this.connected = true;
                this.reconnectAttemptCount = 0;
                console.log('Connected:', frame);

                // Register user
                this.registerUser(userId);

                // Subscribe to default topics
                this.subscribeToTopic('/topic/chat', (msg) => this.handleChatMessage(msg));
                this.subscribeToTopic('/topic/user-status', (msg) => this.handleUserStatus(msg));
                this.subscribeToTopic('/topic/notifications', (msg) => this.handleNotification(msg));

                // Subscribe to private queues
                this.subscribeToUserQueue('/queue/messages', (msg) => this.handlePrivateMessage(msg));
                this.subscribeToUserQueue('/queue/signals', (msg) => this.handleSignalingMessage(msg));
                this.subscribeToUserQueue('/queue/typing', (msg) => this.handleTypingStatus(msg));
                this.subscribeToUserQueue('/queue/pong', (msg) => this.handlePong(msg));

                if (onConnect) onConnect(frame);

                // Emit connected event
                this.emit('connected', { userId, timestamp: new Date() });
            },
            (error) => {
                this.connected = false;
                console.error('Connection error:', error);

                if (onError) onError(error);

                // Attempt reconnection
                this.attemptReconnect(userId, onConnect, onError);

                this.emit('error', { error, timestamp: new Date() });
            }
        );
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.stompClient && this.connected) {
            this.stompClient.disconnect(() => {
                this.connected = false;
                this.subscriptions.clear();
                console.log('Disconnected from WebSocket');
                this.emit('disconnected', { timestamp: new Date() });
            });
        }
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect(userId, onConnect, onError) {
        if (this.reconnectAttemptCount < this.config.reconnectAttempts) {
            this.reconnectAttemptCount++;
            console.log(`Attempting reconnection (${this.reconnectAttemptCount}/${this.config.reconnectAttempts})...`);

            setTimeout(() => {
                this.connect(userId, onConnect, onError);
            }, this.config.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('max-reconnect-attempts', { timestamp: new Date() });
        }
    }

    /**
     * Register user on server
     */
    registerUser(userId) {
        this.send('/app/user/register', {
            userId: userId,
            displayName: userId,
            status: 'ONLINE',
            timestamp: Date.now()
        });
        console.log('User registered:', userId);
    }

    /**
     * Send chat message
     */
    sendChatMessage(recipientId, content, metadata = null) {
        if (!this.connected) {
            console.error('Not connected to WebSocket');
            return;
        }

        const message = {
            type: 'CHAT',
            senderId: this.userId,
            recipientId: recipientId,
            content: content,
            timestamp: Date.now(),
            messageId: this.generateId(),
            metadata: metadata
        };

        this.send('/app/chat/send', message);
        this.emit('message-sent', message);
    }

    /**
     * Send private message to user
     */
    sendPrivateMessage(recipientId, content, metadata = null) {
        if (!this.connected) {
            console.error('Not connected to WebSocket');
            return;
        }

        const message = {
            type: 'CHAT',
            senderId: this.userId,
            content: content,
            timestamp: Date.now(),
            messageId: this.generateId(),
            metadata: metadata
        };

        this.send(`/app/chat/private/${recipientId}`, message);
        this.emit('private-message-sent', message);
    }

    /**
     * Send WebRTC offer
     */
    sendOffer(to, sdpOffer, callId = null) {
        const message = {
            type: 'OFFER',
            from: this.userId,
            to: to,
            sdpOffer: sdpOffer,
            callId: callId || this.generateId(),
            timestamp: Date.now()
        };

        this.send('/app/signal/offer', message);
        this.emit('offer-sent', message);
    }

    /**
     * Send WebRTC answer
     */
    sendAnswer(to, sdpAnswer, callId) {
        const message = {
            type: 'ANSWER',
            from: this.userId,
            to: to,
            sdpAnswer: sdpAnswer,
            callId: callId,
            timestamp: Date.now()
        };

        this.send('/app/signal/answer', message);
        this.emit('answer-sent', message);
    }

    /**
     * Send ICE candidate
     */
    sendIceCandidate(to, candidate, sdpMLineIndex, sdpMid, callId = null) {
        const message = {
            type: 'ICE_CANDIDATE',
            from: this.userId,
            to: to,
            iceCandidate: {
                candidate: candidate,
                sdpMLineIndex: sdpMLineIndex,
                sdpMid: sdpMid
            },
            callId: callId,
            timestamp: Date.now()
        };

        this.send('/app/signal/ice-candidate', message);
        this.emit('ice-candidate-sent', message);
    }

    /**
     * Update user status
     */
    updateStatus(status, statusMessage = null) {
        this.send('/app/status/update', {
            userId: this.userId,
            status: status,
            displayName: this.userId,
            statusMessage: statusMessage,
            timestamp: Date.now()
        });
        this.emit('status-updated', { status, statusMessage });
    }

    /**
     * Send typing notification
     */
    sendTyping(recipientId) {
        this.send('/app/typing/start', {
            senderId: this.userId,
            recipientId: recipientId,
            type: 'TYPING',
            timestamp: Date.now()
        });
    }

    /**
     * Send stop typing notification
     */
    sendStopTyping(recipientId) {
        this.send('/app/typing/stop', {
            senderId: this.userId,
            recipientId: recipientId,
            type: 'STOP_TYPING',
            timestamp: Date.now()
        });
    }

    /**
     * Ping server (health check)
     */
    ping() {
        this.send('/app/ping', 'PING');
    }

    /**
     * Subscribe to a topic (broadcast)
     */
    subscribeToTopic(topic, callback) {
        if (!this.stompClient) {
            console.error('STOMP client not initialized');
            return;
        }

        const subscription = this.stompClient.subscribe(topic, (message) => {
            try {
                const data = JSON.parse(message.body);
                callback(data);
            } catch (e) {
                callback(message.body);
            }
        });

        this.subscriptions.set(topic, subscription);
        console.log('Subscribed to topic:', topic);
    }

    /**
     * Subscribe to user's private queue
     */
    subscribeToUserQueue(queue, callback) {
        if (!this.stompClient) {
            console.error('STOMP client not initialized');
            return;
        }

        const userQueue = `/user/${this.userId}${queue}`;
        const subscription = this.stompClient.subscribe(userQueue, (message) => {
            try {
                const data = JSON.parse(message.body);
                callback(data);
            } catch (e) {
                callback(message.body);
            }
        });

        this.subscriptions.set(userQueue, subscription);
        console.log('Subscribed to queue:', userQueue);
    }

    /**
     * Unsubscribe from topic/queue
     */
    unsubscribe(destination) {
        const subscription = this.subscriptions.get(destination);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(destination);
            console.log('Unsubscribed from:', destination);
        }
    }

    /**
     * Send message to destination
     */
    send(destination, data) {
        if (!this.stompClient || !this.connected) {
            console.error('WebSocket not connected');
            return;
        }

        try {
            this.stompClient.send(destination, {}, JSON.stringify(data));
            console.log('Message sent to:', destination);
        } catch (e) {
            console.error('Error sending message:', e);
        }
    }

    /**
     * Register event handler
     */
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(callback);
    }

    /**
     * Emit event to handlers
     */
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (e) {
                    console.error(`Error in event handler for ${event}:`, e);
                }
            });
        }
    }

    /**
     * Handle incoming chat message
     */
    handleChatMessage(message) {
        console.log('Chat message received:', message);
        this.emit('chat-message', message);
    }

    /**
     * Handle incoming private message
     */
    handlePrivateMessage(message) {
        console.log('Private message received:', message);
        this.emit('private-message', message);
    }

    /**
     * Handle user status update
     */
    handleUserStatus(status) {
        console.log('User status updated:', status);
        this.emit('user-status', status);
    }

    /**
     * Handle notification
     */
    handleNotification(notification) {
        console.log('Notification received:', notification);
        this.emit('notification', notification);
    }

    /**
     * Handle signaling message
     */
    handleSignalingMessage(message) {
        console.log('Signaling message received:', message);
        this.emit('signaling', message);

        // Emit specific signal type events
        if (message.type === 'OFFER') {
            this.emit('offer', message);
        } else if (message.type === 'ANSWER') {
            this.emit('answer', message);
        } else if (message.type === 'ICE_CANDIDATE') {
            this.emit('ice-candidate', message);
        }
    }

    /**
     * Handle typing status
     */
    handleTypingStatus(data) {
        console.log('Typing status:', data);
        this.emit('typing-status', data);
    }

    /**
     * Handle pong response
     */
    handlePong(data) {
        console.log('Pong received:', data);
        this.emit('pong', data);
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `${this.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get connection status
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get active subscriptions
     */
    getSubscriptions() {
        return Array.from(this.subscriptions.keys());
    }
}

// Export for use in browser or module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketClient;
}
