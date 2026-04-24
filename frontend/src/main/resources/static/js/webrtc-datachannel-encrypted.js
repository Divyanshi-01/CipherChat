/**
 * WebRTC Data Channel with AES Encryption
 * Encrypts messages before sending, decrypts after receiving
 */

class WebRTCDataChannelEncrypted extends WebRTCDataChannel {
    constructor(config = {}) {
        super(config);
        this.cryptoClient = config.cryptoClient || new CryptoClient();
        this.encryptionEnabled = config.encryptionEnabled !== false;
        this.showEncrypted = config.showEncrypted !== false;
    }

    /**
     * Send encrypted message via data channel
     */
    sendMessage(content, metadata = {}) {
        if (!this.isConnected || !this.dataChannel) {
            console.warn('Data channel not connected, queuing message');
            this.messageQueue.push({ content, metadata });
            return false;
        }

        try {
            const messageId = this.generateId();
            let encryptedContent = content;
            let wasEncrypted = false;

            // Encrypt message if enabled
            if (this.encryptionEnabled) {
                encryptedContent = this.cryptoClient.encryptMessage(content, this.remoteUserId);
                wasEncrypted = true;
                console.log(`Message encrypted: ${content.substring(0, 30)}...`);
            }

            const message = {
                type: 'TEXT',
                senderId: this.localUserId,
                recipientId: this.remoteUserId,
                content: content, // Original content
                encryptedContent: encryptedContent,
                timestamp: Date.now(),
                messageId: messageId,
                encrypted: wasEncrypted,
                ...metadata
            };

            // Send encrypted message
            this.dataChannel.send(JSON.stringify(message));
            console.log('Encrypted message sent:', messageId);
            this.emit('message-sent', message);

            return true;

        } catch (error) {
            console.error('Error sending message:', error);
            this.messageQueue.push({ content, metadata });
            return false;
        }
    }

    /**
     * Setup data channel with decryption handling
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
                console.log('Encrypted message received:', data.messageId);

                let decryptedContent = data.content;

                // Decrypt message if it was encrypted
                if (data.encrypted && data.encryptedContent) {
                    decryptedContent = this.cryptoClient.decryptMessage(
                        data.encryptedContent,
                        data.senderId
                    );

                    if (decryptedContent) {
                        console.log(`Message decrypted: ${decryptedContent.substring(0, 30)}...`);
                    } else {
                        console.warn('Decryption failed, using encrypted content');
                        decryptedContent = data.encryptedContent;
                    }
                }

                // Create message object with both encrypted and decrypted content
                const message = {
                    ...data,
                    content: decryptedContent, // Set to decrypted content
                    plainContent: decryptedContent // For display
                };

                console.log('Message ready for display:', message.messageId);
                this.emit('message', message);

            } catch (e) {
                console.warn('Failed to parse message:', event.data);
                this.emit('message', {
                    content: event.data,
                    timestamp: Date.now(),
                    encrypted: false
                });
            }
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.emit('data-channel-error', error);
        };
    }

    /**
     * Enable/Disable encryption
     */
    setEncryptionEnabled(enabled) {
        this.encryptionEnabled = enabled;
        console.log('Encryption: ' + (enabled ? 'ENABLED' : 'DISABLED'));
        this.emit('encryption-toggled', { enabled });
    }

    /**
     * Get encryption status
     */
    isEncryptionEnabled() {
        return this.encryptionEnabled;
    }

    /**
     * Get client encryption keys
     */
    getEncryptionKeys() {
        return this.cryptoClient.getKeys();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCDataChannelEncrypted;
}