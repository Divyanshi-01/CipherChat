
/**
 * Simple STOMP WebSocket Client using SockJS
 * Handles real-time signaling for WebRTC
 */

class StompClient {
    constructor(config = {}) {
        this.config = {
            wsUrl: config.wsUrl || 'ws://localhost:8080/ws',
            debug: config.debug || false,
            reconnect: config.reconnect !== false,
            reconnectInterval: config.reconnectInterval || 5000,
            reconnectAttempts: config.reconnectAttempts || 10,
            ...config
        };

        this.stompClient = null;
        this.connected = false;
        this.reconnectCount = 0;
        this.subscriptions = new Map();
        this.messageHandlers = new Map();

        this.init();
    }

    /**
     * Initialize STOMP client
     */
    init() {
        console.log('Initializing STOMP client...');

        if (typeof SockJS === 'undefined') {
            console.error('SockJS not loaded. Include: <script src="https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js"></script>');
            return;
        }

        if (typeof Stomp === 'undefined') {
            console.error('STOMP not loaded. Include: <script src="https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js"></script>');
            return;
        }

        const socket = new SockJS(this.config.wsUrl);
        this.stompClient = Stomp.over(socket);

        if (!this.config.debug) {
            this.stompClient.debug = null;
        }

        console.log('STOMP client initialized');
    }

    /**
     * Connect to WebSocket server
     * @param {Function} onConnect - Callback when connected
     * @param {Function} onError - Callback on error
     */
    connect(onConnect = null, onError = null) {
        if (this.connected) {
            console.warn('Already connected');
            return;
        }

        if (!this.stompClient) {
            console.error('STOMP client not initialized');
            return;
        }

        const headers = {};

        this.stompClient.connect(
            headers,
            (frame) => {
                this.connected = true;
                this.reconnectCount = 0;
                console.log('✓ Connected to STOMP server');

                if (onConnect) {
                    onConnect(frame);
                }

                this.emit('connected', { timestamp: new Date() });
            },
            (error) => {
                console.error('Connection error:', error);

                if (onError) {
                    onError(error);
                }

                if (this.config.reconnect) {
                    this.attemptReconnect(onConnect, onError);
                }

                this.emit('error', { error });
            }
        );
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect(onConnect, onError) {
        if (this.reconnectCount < this.config.reconnectAttempts) {
            this.reconnectCount++;
            console.log(`Reconnecting... (${this.reconnectCount}/${this.config.reconnectAttempts})`);

            setTimeout(() => {
                this.init();
                this.connect(onConnect, onError);
            }, this.config.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect-failed');
        }
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.stompClient && this.connected) {
            this.stompClient.disconnect(() => {
                this.connected = false;
                this.subscriptions.clear();
                console.log('Disconnected from STOMP server');
                this.emit('disconnected');
            });
        }
    }

    /**
     * Subscribe to a topic
     * @param {string} destination - Topic path (e.g., /topic/offer)
     * @param {Function} callback - Callback function for messages
     */
    subscribe(destination, callback) {
        if (!this.stompClient || !this.connected) {
            console.error('Not connected to STOMP server');
            return null;
        }

        try {
            const subscription = this.stompClient.subscribe(destination, (message) => {
                try {
                    const data = JSON.parse(message.body);
                    console.log(`Message from ${destination}:`, data);
                    callback(data);
                } catch (e) {
                    console.warn(`Failed to parse message from ${destination}:`, message.body);
                    callback(message.body);
                }
            });

            this.subscriptions.set(destination, subscription);
            console.log(`✓ Subscribed to: ${destination}`);

            return subscription;
        } catch (error) {
            console.error(`Error subscribing to ${destination}:`, error);
            return null;
        }
    }

    /**
     * Unsubscribe from a topic
     */
    unsubscribe(destination) {
        const subscription = this.subscriptions.get(destination);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(destination);
            console.log(`Unsubscribed from: ${destination}`);
        }
    }

    /**
     * Send message to destination
     * @param {string} destination - Endpoint path (e.g., /app/offer)
     * @param {object} data - Message data
     */
    send(destination, data) {
        if (!this.stompClient || !this.connected) {
            console.error('Not connected to STOMP server');
            return false;
        }

        try {
            this.stompClient.send(destination, {}, JSON.stringify(data));
            console.log(`Message sent to ${destination}:`, data);
            return true;
        } catch (error) {
            console.error(`Error sending message to ${destination}:`, error);
            return false;
        }
    }

    /**
     * Send WebRTC offer
     * @param {object} offerData - Offer data { type, senderId, recipientId, sdp, ... }
     */
    sendOffer(offerData) {
        const message = {
            type: 'OFFER',
            ...offerData,
            timestamp: Date.now()
        };
        return this.send('/app/offer', message);
    }

    /**
     * Send WebRTC answer
     * @param {object} answerData - Answer data { type, senderId, recipientId, sdp, ... }
     */
    sendAnswer(answerData) {
        const message = {
            type: 'ANSWER',
            ...answerData,
            timestamp: Date.now()
        };
        return this.send('/app/answer', message);
    }

    /**
     * Send ICE candidate
     * @param {object} candidateData - Candidate data { senderId, recipientId, candidate, ... }
     */
    sendCandidate(candidateData) {
        const message = {
            type: 'CANDIDATE',
            ...candidateData,
            timestamp: Date.now()
        };
        return this.send('/app/candidate', message);
    }

    /**
     * Register event handler
     */
    on(event, callback) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, []);
        }
        this.messageHandlers.get(event).push(callback);
    }

    /**
     * Emit event to handlers
     */
    emit(event, data) {
        if (this.messageHandlers.has(event)) {
            this.messageHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (e) {
                    console.error(`Error in event handler for ${event}:`, e);
                }
            });
        }
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

    /**
     * Get client statistics
     */
    getStats() {
        return {
            connected: this.connected,
            reconnectCount: this.reconnectCount,
            subscriptions: this.getSubscriptions(),
            handlers: Array.from(this.messageHandlers.keys())
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StompClient;
}