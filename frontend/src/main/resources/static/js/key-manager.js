(function (window) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    class KeyManager {
        static ensureSupported() {
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('WebCrypto is not available in this browser.');
            }
        }

        static async generateIdentity() {
            this.ensureSupported();

            const keyPair = await window.crypto.subtle.generateKey(
                { name: 'X25519' },
                true,
                ['deriveBits']
            );

            const publicJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
            const privateJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
            const userId = await this.deriveUserId(publicJwk);

            return {
                userId,
                publicJwk,
                privateJwk,
                publicKey: this.serializePublicJwk(publicJwk),
                backupString: this.exportPrivateKey(privateJwk)
            };
        }

        static async importIdentity(backupString) {
            this.ensureSupported();

            const privateJwk = JSON.parse(decoder.decode(this.base64UrlToBytes(backupString.trim())));
            if (!privateJwk || privateJwk.crv !== 'X25519' || !privateJwk.x || !privateJwk.d) {
                throw new Error('Backup string is not a valid X25519 private key.');
            }

            const publicJwk = {
                key_ops: [],
                ext: true,
                kty: privateJwk.kty,
                crv: privateJwk.crv,
                x: privateJwk.x
            };

            const userId = await this.deriveUserId(publicJwk);
            return {
                userId,
                publicJwk,
                privateJwk,
                publicKey: this.serializePublicJwk(publicJwk),
                backupString: backupString.trim()
            };
        }

        static async materializeIdentity(identityRecord) {
            const publicJwk = this.normalizePublicJwk(identityRecord.publicJwk || identityRecord.publicKey);
            return {
                userId: identityRecord.userId,
                publicJwk,
                privateJwk: identityRecord.privateJwk,
                publicKey: this.serializePublicJwk(publicJwk),
                privateKey: await this.importPrivateKey(identityRecord.privateJwk)
            };
        }

        static async deriveUserId(publicJwk) {
            const digest = await window.crypto.subtle.digest(
                'SHA-256',
                encoder.encode(this.serializePublicJwk(publicJwk))
            );
            return this.bytesToHex(new Uint8Array(digest)).slice(0, 24);
        }

        static async importPrivateKey(privateJwk) {
            return window.crypto.subtle.importKey(
                'jwk',
                privateJwk,
                { name: 'X25519' },
                false,
                ['deriveBits']
            );
        }

        static async importPublicKey(publicJwkOrString) {
            return window.crypto.subtle.importKey(
                'jwk',
                this.normalizePublicJwk(publicJwkOrString),
                { name: 'X25519' },
                false,
                []
            );
        }

        static serializePublicJwk(publicJwk) {
            const normalized = this.normalizePublicJwk(publicJwk);
            return JSON.stringify({
                kty: normalized.kty,
                crv: normalized.crv,
                x: normalized.x
            });
        }

        static normalizePublicJwk(publicJwkOrString) {
            const parsed = typeof publicJwkOrString === 'string'
                ? JSON.parse(publicJwkOrString)
                : publicJwkOrString;

            return {
                key_ops: [],
                ext: true,
                kty: parsed.kty,
                crv: parsed.crv,
                x: parsed.x
            };
        }

        static exportPrivateKey(privateJwk) {
            return this.bytesToBase64Url(encoder.encode(JSON.stringify(privateJwk)));
        }

        static bytesToBase64Url(bytes) {
            let binary = '';
            bytes.forEach((value) => {
                binary += String.fromCharCode(value);
            });
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        }

        static base64UrlToBytes(base64Url) {
            const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
            const binary = atob(normalized + padding);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }

        static bytesToHex(bytes) {
            return Array.from(bytes)
                .map((value) => value.toString(16).padStart(2, '0'))
                .join('');
        }
    }

    window.KeyManager = KeyManager;
})(window);
