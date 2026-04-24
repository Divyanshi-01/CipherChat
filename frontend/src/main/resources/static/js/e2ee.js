(function (window) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const ROTATION_WINDOW_MS = 15 * 60 * 1000;

    class E2EE {
        static async encryptMessage(identity, recipient, plaintext) {
            const timestamp = Date.now();
            const keyVersion = this.getKeyVersion(timestamp);
            const messageId = window.crypto.randomUUID();
            const nonce = window.crypto.getRandomValues(new Uint8Array(12));
            const recipientKey = await KeyManager.importPublicKey(recipient.publicKey);
            const aesKey = await this.deriveSessionKey(
                identity.privateKey,
                recipientKey,
                identity.userId,
                recipient.userId,
                keyVersion
            );

            const metadata = {
                from: identity.userId,
                to: recipient.userId,
                messageId,
                timestamp,
                keyVersion
            };

            const ciphertext = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce,
                    additionalData: this.additionalData(metadata),
                    tagLength: 128
                },
                aesKey,
                encoder.encode(plaintext)
            );

            return {
                ...metadata,
                nonce: KeyManager.bytesToBase64Url(nonce),
                ciphertext: KeyManager.bytesToBase64Url(new Uint8Array(ciphertext)),
                senderPublicKey: identity.publicKey
            };
        }

        static async decryptMessage(identity, message, conversationPublicKey) {
            const otherPartyPublicKey = conversationPublicKey || message.senderPublicKey;
            const senderKey = await KeyManager.importPublicKey(otherPartyPublicKey);
            const timestamp = Number(message.timestamp);
            const keyVersion = Number(message.keyVersion);

            const aesKey = await this.deriveSessionKey(
                identity.privateKey,
                senderKey,
                identity.userId,
                message.from,
                keyVersion
            );

            const plaintext = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: KeyManager.base64UrlToBytes(message.nonce),
                    additionalData: this.additionalData({
                        from: message.from,
                        to: message.to,
                        messageId: message.messageId,
                        timestamp,
                        keyVersion
                    }),
                    tagLength: 128
                },
                aesKey,
                KeyManager.base64UrlToBytes(message.ciphertext)
            );

            return decoder.decode(plaintext);
        }

        static async deriveSessionKey(privateKey, publicKey, selfId, otherId, keyVersion) {
            const sharedBits = await window.crypto.subtle.deriveBits(
                {
                    name: 'X25519',
                    public: publicKey
                },
                privateKey,
                256
            );

            const baseKey = await window.crypto.subtle.importKey(
                'raw',
                sharedBits,
                'HKDF',
                false,
                ['deriveKey']
            );

            return window.crypto.subtle.deriveKey(
                {
                    name: 'HKDF',
                    hash: 'SHA-256',
                    salt: encoder.encode(this.conversationSalt(selfId, otherId, keyVersion)),
                    info: encoder.encode('cipherchat-session')
                },
                baseKey,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt', 'decrypt']
            );
        }

        static getKeyVersion(timestamp) {
            return Math.floor(timestamp / ROTATION_WINDOW_MS);
        }

        static conversationSalt(a, b, keyVersion) {
            return `${[a, b].sort().join(':')}:${keyVersion}`;
        }

        static additionalData(metadata) {
            return encoder.encode(JSON.stringify(metadata));
        }

        static dedupeMessages(messages) {
            const unique = new Map();
            messages.forEach((message) => {
                if (!unique.has(message.messageId)) {
                    unique.set(message.messageId, message);
                }
            });

            return Array.from(unique.values()).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
        }
    }

    window.E2EE = E2EE;
})(window);
