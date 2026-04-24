/**
 * Client-side AES encryption/decryption using TweetNaCl.js
 * For WebRTC data channel message encryption
 */

class CryptoClient {
    constructor() {
        this.keys = new Map(); // userId -> key
        this.keyLoaded = false;
    }

    /**
     * Initialize crypto (load required libraries)
     */
    async init() {
        // Check if TweetNaCl is available
        if (typeof nacl === 'undefined') {
            console.warn('TweetNaCl not loaded, using CryptoJS instead');
            await this.loadCryptoJS();
        }
        this.keyLoaded = true;
    }

    /**
     * Load CryptoJS library
     */
    async loadCryptoJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.0/crypto-js.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Generate a random key for a user
     */
    generateKey(userId) {
        // Generate a 256-bit random key (64 character hex string)
        const key = this.randomHex(32); // 32 bytes = 256 bits
        this.keys.set(userId, key);
        console.log(`Generated key for user: ${userId}`);
        return key;
    }

    /**
     * Set key for a user (from backend)
     */
    setKey(userId, key) {
        this.keys.set(userId, key);
        console.log(`Key set for user: ${userId}`);
    }

    /**
     * Get key for a user
     */
    getKey(userId) {
        if (!this.keys.has(userId)) {
            return this.generateKey(userId);
        }
        return this.keys.get(userId);
    }

    /**
     * Encrypt message using AES (with CryptoJS)
     */
    encryptMessage(message, userId) {
        try {
            const key = this.getKey(userId);

            // Create a cipher
            const encrypted = CryptoJS.AES.encrypt(message, key).toString();

            console.log(`Message encrypted for ${userId}`);
            return encrypted;

        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    /**
     * Decrypt message using AES (with CryptoJS)
     */
    decryptMessage(encryptedMessage, userId) {
        try {
            const key = this.getKey(userId);

            // Decrypt the message
            const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key).toString(CryptoJS.enc.Utf8);

            if (!decrypted) {
                console.warn('Decryption failed - empty result');
                return null;
            }

            console.log(`Message decrypted from ${userId}`);
            return decrypted;

        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    /**
     * Encrypt JSON data
     */
    encryptData(data, userId) {
        try {
            const jsonString = JSON.stringify(data);
            return this.encryptMessage(jsonString, userId);
        } catch (error) {
            console.error('Error encrypting data:', error);
            return null;
        }
    }

    /**
     * Decrypt JSON data
     */
    decryptData(encryptedData, userId) {
        try {
            const jsonString = this.decryptMessage(encryptedData, userId);
            if (!jsonString) return null;
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error decrypting data:', error);
            return null;
        }
    }

    /**
     * Generate random hex string
     */
    randomHex(length) {
        let result = '';
        const characters = '0123456789abcdef';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    /**
     * Get all user keys
     */
    getKeys() {
        const keys = {};
        this.keys.forEach((value, key) => {
            keys[key] = value.substring(0, 8) + '...'; // Show only first 8 chars
        });
        return keys;
    }

    /**
     * Clear all keys
     */
    clearKeys() {
        this.keys.clear();
        console.log('All keys cleared');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoClient;
}