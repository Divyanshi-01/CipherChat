/**
 * WebRTC Data Channel for P2P Messaging
 * Handles peer connection and data channel communication
 */

class WebRTCDataChannel {
    constructor(config = {}) {
        this.config = {
            iceServers: config.iceServers || [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ],
            ...config
        };

        this.peerConnection = null;
        this.dataChannel = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isConnected = false;
        this.isInitiator = false;
        this.remoteUserId = null;
        this.localUserId = null;

        this.eventHandlers = new Map();
        this.messageQueue = [];
    }

    /**
     * Create peer connection
     */
    async createPeerConnection(isInitiator = false) {
        try {
            if (this.peerConnection) {
                console.warn('Peer connection already exists');
                return this.peerConnection;
            }

            this.isInitiator = isInitiator;

            // Create RTCPeerConnection
            this.peerConnection = new RTCPeerConnection({
                iceServers: this.config.iceServers
            });

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('ICE candidate:', event.candidate);
                    this.emit('ice-candidate', event.candidate);
                }
            };

            // Handle connection state changes
            this.peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', this.peerConnection.connectionState);
                this.emit('connection-state-change', this.peerConnection.connectionState);

                if (this.peerConnection.connectionState === 'connected') {
                    this.isConnected = true;
                    this.emit('connected');
                    this.flushMessageQueue();
                } else if (this.peerConnection.connectionState === 'failed' ||
                    this.peerConnection.connectionState === 'disconnected') {
                    this.isConnected = false;
                    this.emit('disconnected');
                }
            };

            // Handle ICE connection state
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', this.peerConnection.iceConnectionState);
            };

            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                console.log('Remote track received:', event.track.kind);
                this.remoteStream = event.streams[0];
                this.emit('remote-stream', event.streams[0]);
            };

            // Add local stream if available
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }

            // If initiator, create data channel
            if (isInitiator) {
                this.createDataChannel();
            } else {
                // If not initiator, wait for remote data channel
                this.peerConnection.ondatachannel = (event) => {
                    this.setDataChannel(event.channel);
                };
            }

            console.log('Peer connection created (initiator: ' + isInitiator + ')');
            this.emit('peer-connection-created');

            return this.peerConnection;

        } catch (error) {
            console.error('Error creating peer connection:', error);
            this.emit('error', { error: 'Failed to create peer connection' });
            throw error;
        }
    }

    /**
     * Create data channel
     */
    createDataChannel() {
        try {
            if (!this.peerConnection) {
                throw new Error('Peer connection not created');
            }

            this.dataChannel = this.peerConnection.createDataChannel('chat', {
                ordered: true
            });

            this.setupDataChannelListeners();
            console.log('Data channel created');
            this.emit('data-channel-created');

        } catch (error) {
            console.error('Error creating data channel:', error);
            this.emit('error', { error: 'Failed to create data channel' });
        }
    }

    /**
     * Set data channel and setup listeners
     */
    setDataChannel(channel) {
        this.dataChannel = channel;
        this.setupDataChannelListeners();
        console.log('Data channel set from remote peer');
    }

    /**
     * Setup data channel event listeners
     */
    setupDataChannelListeners() {
        if (!this.dataChannel) {
            console.error('Data channel not available');
            return;
        }

        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.isConnected = true;
            this.emit('data-channel-open');
            this.flushMessageQueue();
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.isConnected = false;
            this.emit('data-channel-close');
        };

        this.dataChannel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Message received:', data);
                this.emit('message', data);
            } catch (e) {
                console.warn('Failed to parse message:', event.data);
                this.emit('message', { content: event.data, timestamp: Date.now() });
            }
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.emit('data-channel-error', error);
        };
    }

    /**
     * Send message via data channel
     */
    sendMessage(content, metadata = {}) {
        if (!this.isConnected || !this.dataChannel) {
            console.warn('Data channel not connected, queuing message');
            this.messageQueue.push({ content, metadata });
            return false;
        }

        try {
            const message = {
                type: 'TEXT',
                senderId: this.localUserId,
                recipientId: this.remoteUserId,
                content: content,
                timestamp: Date.now(),
                messageId: this.generateId(),
                ...metadata
            };

            this.dataChannel.send(JSON.stringify(message));
            console.log('Message sent:', message);
            this.emit('message-sent', message);

            return true;

        } catch (error) {
            console.error('Error sending message:', error);
            this.messageQueue.push({ content, metadata });
            return false;
        }
    }

    /**
     * Flush queued messages
     */
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.sendMessage(msg.content, msg.metadata);
        }
    }

    /**
     * Create offer
     */
    async createOffer() {
        try {
            if (!this.peerConnection) {
                await this.createPeerConnection(true);
            }

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            console.log('Offer created');
            this.emit('offer', offer);

            return offer;

        } catch (error) {
            console.error('Error creating offer:', error);
            this.emit('error', { error: 'Failed to create offer' });
            throw error;
        }
    }

    /**
     * Handle received offer
     */
    async handleOffer(offer) {
        try {
            if (!this.peerConnection) {
                await this.createPeerConnection(false);
            }

            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            console.log('Answer created');
            this.emit('answer', answer);

            return answer;

        } catch (error) {
            console.error('Error handling offer:', error);
            this.emit('error', { error: 'Failed to handle offer' });
            throw error;
        }
    }

    /**
     * Handle received answer
     */
    async handleAnswer(answer) {
        try {
            if (!this.peerConnection) {
                throw new Error('Peer connection not created');
            }

            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(answer)
            );

            console.log('Answer handled');
            this.emit('answer-handled');

        } catch (error) {
            console.error('Error handling answer:', error);
            this.emit('error', { error: 'Failed to handle answer' });
            throw error;
        }
    }

    /**
     * Add ICE candidate
     */
    async addIceCandidate(candidate) {
        try {
            if (!this.peerConnection) {
                throw new Error('Peer connection not created');
            }

            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
            );

            console.log('ICE candidate added');

        } catch (error) {
            console.error('Error adding ICE candidate:', error);
            // Don't throw error for ICE candidates as some may fail
        }
    }

    /**
     * Get local media stream
     */
    async getLocalStream(config = {}) {
        try {
            const constraints = {
                audio: config.audio !== false,
                video: config.video !== false ? {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 }
                } : false
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Local stream obtained');
            this.emit('local-stream', this.localStream);

            return this.localStream;

        } catch (error) {
            console.error('Error getting local stream:', error);
            this.emit('error', { error: 'Failed to get local stream' });
            throw error;
        }
    }

    /**
     * Stop local stream
     */
    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
            console.log('Local stream stopped');
        }
    }

    /**
     * Close peer connection
     */
    close() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
            this.dataChannel = null;
            this.isConnected = false;
            console.log('Peer connection closed');
            this.emit('closed');
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
     * Emit event
     */
    emit(event, data = null) {
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
     * Generate unique ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get connection status
     */
    getStatus() {
        if (!this.peerConnection) {
            return 'not_connected';
        }
        return this.peerConnection.connectionState;
    }

    /**
     * Get statistics
     */
    async getStats() {
        if (!this.peerConnection) return null;

        const stats = {
            connectionState: this.peerConnection.connectionState,
            iceConnectionState: this.peerConnection.iceConnectionState,
            iceGatheringState: this.peerConnection.iceGatheringState,
            signalingState: this.peerConnection.signalingState,
            dataChannelState: this.dataChannel ? this.dataChannel.readyState : 'not_created'
        };

        return stats;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCDataChannel;
}