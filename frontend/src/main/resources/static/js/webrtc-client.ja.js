/**
 * WebRTC Client for P2P Communication
 * Handles peer connections and signaling
 */

class WebRTCClient {
    constructor(wsClient, config = {}) {
        this.wsClient = wsClient;
        this.config = {
            iceServers: config.iceServers || [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ],
            ...config
        };

        this.peerConnections = new Map();
        this.localStream = null;
        this.eventHandlers = new Map();

        this.initializeSignaling();
    }

    /**
     * Initialize WebRTC signaling
     */
    initializeSignaling() {
        if (!this.wsClient.isConnected()) {
            console.error('WebSocket client not connected');
            return;
        }

        // Subscribe to WebRTC topics
        this.wsClient.subscribeToTopic('/topic/offer', (msg) => this.handleOffer(msg));
        this.wsClient.subscribeToTopic('/topic/answer', (msg) => this.handleAnswer(msg));
        this.wsClient.subscribeToTopic('/topic/candidate', (msg) => this.handleCandidate(msg));
        this.wsClient.subscribeToTopic('/topic/call-initiated', (msg) => this.handleCallInitiated(msg));
        this.wsClient.subscribeToTopic('/topic/call-ended', (msg) => this.handleCallEnded(msg));
        this.wsClient.subscribeToTopic('/topic/call-rejected', (msg) => this.handleCallRejected(msg));
        this.wsClient.subscribeToTopic('/topic/register', (msg) => this.handleRegister(msg));

        // Subscribe to user-specific queues
        this.wsClient.subscribeToUserQueue('/queue/offer', (msg) => this.handleOfferDirect(msg));
        this.wsClient.subscribeToUserQueue('/queue/answer', (msg) => this.handleAnswerDirect(msg));
        this.wsClient.subscribeToUserQueue('/queue/candidate', (msg) => this.handleCandidateDirect(msg));

        console.log('WebRTC signaling initialized');
    }

    /**
     * Get local media stream (audio/video)
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
            this.emit('error', { error: 'Failed to get local stream: ' + error.message });
            throw error;
        }
    }

    /**
     * Stop local media stream
     */
    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
            console.log('Local stream stopped');
        }
    }

    /**
     * Initiate a call to another user
     */
    async initiateCall(recipientId) {
        try {
            const callId = this.generateCallId();

            // Send call initiation signal
            this.wsClient.send('/app/webrtc/call-initiate', {
                type: 'CALL_INITIATED',
                senderId: this.wsClient.userId,
                recipientId: recipientId,
                callId: callId,
                timestamp: Date.now()
            });

            // Create peer connection
            await this.createPeerConnection(recipientId, callId, true);

            console.log('Call initiated to:', recipientId);
            this.emit('call-initiated', { recipientId, callId });

            return callId;

        } catch (error) {
            console.error('Error initiating call:', error);
            this.emit('error', { error: 'Failed to initiate call' });
            throw error;
        }
    }

    /**
     * Reject an incoming call
     */
    rejectCall(recipientId, callId) {
        try {
            this.wsClient.send('/app/webrtc/call-reject', {
                type: 'CALL_REJECTED',
                senderId: this.wsClient.userId,
                recipientId: recipientId,
                callId: callId,
                timestamp: Date.now()
            });

            console.log('Call rejected from:', recipientId);
            this.emit('call-rejected', { recipientId, callId });

        } catch (error) {
            console.error('Error rejecting call:', error);
        }
    }

    /**
     * End a call
     */
    endCall(recipientId, callId) {
        try {
            // Close peer connection
            this.closePeerConnection(recipientId);

            // Send call end signal
            this.wsClient.send('/app/webrtc/call-end', {
                type: 'CALL_ENDED',
                senderId: this.wsClient.userId,
                recipientId: recipientId,
                callId: callId,
                timestamp: Date.now()
            });

            console.log('Call ended with:', recipientId);
            this.emit('call-ended', { recipientId, callId });

        } catch (error) {
            console.error('Error ending call:', error);
        }
    }

    /**
     * Create peer connection with another user
     */
    async createPeerConnection(recipientId, callId, initiator = false) {
        try {
            // Check if connection already exists
            if (this.peerConnections.has(recipientId)) {
                console.log('Peer connection already exists for:', recipientId);
                return this.peerConnections.get(recipientId);
            }

            // Create RTCPeerConnection
            const peerConnection = new RTCPeerConnection({
                iceServers: this.config.iceServers
            });

            // Add local stream tracks to connection
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, this.localStream);
                });
            }

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendCandidate(recipientId, event.candidate, callId);
                }
            };

            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', peerConnection.connectionState);
                this.emit('connection-state-change', {
                    recipientId,
                    state: peerConnection.connectionState
                });
            };

            // Handle ICE connection state changes
            peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', peerConnection.iceConnectionState);
            };

            // Handle remote stream
            peerConnection.ontrack = (event) => {
                console.log('Remote track received:', event.track.kind);
                this.emit('remote-stream', {
                    recipientId,
                    stream: event.streams[0],
                    track: event.track
                });
            };

            // If initiator, create offer
            if (initiator) {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                this.sendOffer(recipientId, offer, callId);
            }

            // Store connection
            this.peerConnections.set(recipientId, {
                connection: peerConnection,
                callId: callId,
                initiator: initiator
            });

            console.log('Peer connection created with:', recipientId);
            return peerConnection;

        } catch (error) {
            console.error('Error creating peer connection:', error);
            this.emit('error', { error: 'Failed to create peer connection' });
            throw error;
        }
    }

    /**
     * Send offer to recipient
     */
    async sendOffer(recipientId, offer, callId) {
        try {
            this.wsClient.send('/app/offer/direct/' + recipientId, {
                type: 'OFFER',
                senderId: this.wsClient.userId,
                recipientId: recipientId,
                sdp: offer.sdp,
                callId: callId,
                timestamp: Date.now()
            });

            console.log('Offer sent to:', recipientId);
            this.emit('offer-sent', { recipientId, callId });

        } catch (error) {
            console.error('Error sending offer:', error);
            this.emit('error', { error: 'Failed to send offer' });
        }
    }

    /**
     * Handle incoming offer
     */
    async handleOfferDirect(message) {
        try {
            console.log('Offer received from:', message.senderId);

            const recipientId = message.senderId;
            const callId = message.callId;

            // Create peer connection if not exists
            if (!this.peerConnections.has(recipientId)) {
                await this.createPeerConnection(recipientId, callId, false);
            }

            const peerConnection = this.peerConnections.get(recipientId).connection;

            // Set remote description
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: 'offer', sdp: message.sdp })
            );

            // Create answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            this.sendAnswer(recipientId, answer, callId);

            this.emit('offer-received', {
                senderId: recipientId,
                callId: callId
            });

        } catch (error) {
            console.error('Error handling offer:', error);
            this.emit('error', { error: 'Failed to handle offer' });
        }
    }

    /**
     * Handle incoming offer from topic
     */
    async handleOffer(message) {
        console.log('Offer received from topic:', message.senderId);
        await this.handleOfferDirect(message);
    }

    /**
     * Send answer to recipient
     */
    async sendAnswer(recipientId, answer, callId) {
        try {
            this.wsClient.send('/app/answer/direct/' + recipientId, {
                type: 'ANSWER',
                senderId: this.wsClient.userId,
                recipientId: recipientId,
                sdp: answer.sdp,
                callId: callId,
                timestamp: Date.now()
            });

            console.log('Answer sent to:', recipientId);
            this.emit('answer-sent', { recipientId, callId });

        } catch (error) {
            console.error('Error sending answer:', error);
            this.emit('error', { error: 'Failed to send answer' });
        }
    }

    /**
     * Handle incoming answer
     */
    async handleAnswerDirect(message) {
        try {
            console.log('Answer received from:', message.senderId);

            const recipientId = message.senderId;
            const peerData = this.peerConnections.get(recipientId);

            if (!peerData) {
                console.error('No peer connection found for:', recipientId);
                return;
            }

            const peerConnection = peerData.connection;

            // Set remote description
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: message.sdp })
            );

            this.emit('answer-received', {
                senderId: recipientId,
                callId: message.callId
            });

        } catch (error) {
            console.error('Error handling answer:', error);
            this.emit('error', { error: 'Failed to handle answer' });
        }
    }

    /**
     * Handle incoming answer from topic
     */
    async handleAnswer(message) {
        console.log('Answer received from topic:', message.senderId);
        await this.handleAnswerDirect(message);
    }

    /**
     * Send ICE candidate
     */
    sendCandidate(recipientId, candidate, callId) {
        try {
            this.wsClient.send('/app/candidate/direct/' + recipientId, {
                type: 'CANDIDATE',
                senderId: this.wsClient.userId,
                recipientId: recipientId,
                candidate: {
                    candidate: candidate.candidate,
                    sdpMLineIndex: candidate.sdpMLineIndex,
                    sdpMid: candidate.sdpMid
                },
                callId: callId,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error sending candidate:', error);
        }
    }

    /**
     * Handle incoming ICE candidate
     */
    async handleCandidateDirect(message) {
        try {
            const recipientId = message.senderId;
            const peerData = this.peerConnections.get(recipientId);

            if (!peerData) {
                console.error('No peer connection found for:', recipientId);
                return;
            }

            const peerConnection = peerData.connection;
            const iceCandidate = new RTCIceCandidate({
                candidate: message.candidate.candidate,
                sdpMLineIndex: message.candidate.sdpMLineIndex,
                sdpMid: message.candidate.sdpMid
            });

            await peerConnection.addIceCandidate(iceCandidate);
            console.log('ICE candidate added from:', recipientId);

        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    /**
     * Handle incoming ICE candidate from topic
     */
    async handleCandidate(message) {
        await this.handleCandidateDirect(message);
    }

    /**
     * Handle call initiated
     */
    handleCallInitiated(message) {
        console.log('Call initiated from:', message.senderId);
        this.emit('incoming-call', {
            senderId: message.senderId,
            callId: message.callId
        });
    }

    /**
     * Handle call ended
     */
    handleCallEnded(message) {
        console.log('Call ended from:', message.senderId);
        this.closePeerConnection(message.senderId);
        this.emit('call-ended', {
            senderId: message.senderId,
            callId: message.callId
        });
    }

    /**
     * Handle call rejected
     */
    handleCallRejected(message) {
        console.log('Call rejected by:', message.senderId);
        this.closePeerConnection(message.senderId);
        this.emit('call-rejected', {
            senderId: message.senderId,
            callId: message.callId
        });
    }

    /**
     * Handle user registration
     */
    handleRegister(message) {
        console.log('User registered:', message.senderId);
        this.emit('user-registered', {
            userId: message.senderId
        });
    }

    /**
     * Close peer connection
     */
    closePeerConnection(recipientId) {
        const peerData = this.peerConnections.get(recipientId);
        if (peerData) {
            peerData.connection.close();
            this.peerConnections.delete(recipientId);
            console.log('Peer connection closed with:', recipientId);
        }
    }

    /**
     * Get peer connection
     */
    getPeerConnection(recipientId) {
        const peerData = this.peerConnections.get(recipientId);
        return peerData ? peerData.connection : null;
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
     * Generate call ID
     */
    generateCallId() {
        return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get active peer connections
     */
    getActivePeers() {
        return Array.from(this.peerConnections.keys());
    }

    /**
     * Get peer statistics
     */
    async getPeerStats(recipientId) {
        const peerConnection = this.getPeerConnection(recipientId);
        if (!peerConnection) return null;

        const stats = await peerConnection.getStats();
        const result = {};

        stats.forEach(report => {
            if (report.type === 'inbound-rtp') {
                result.inboundRtp = {
                    bytesReceived: report.bytesReceived,
                    packetsReceived: report.packetsReceived,
                    packetsLost: report.packetsLost
                };
            } else if (report.type === 'outbound-rtp') {
                result.outboundRtp = {
                    bytesSent: report.bytesSent,
                    packetsSent: report.packetsSent
                };
            }
        });

        return result;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCClient;
}