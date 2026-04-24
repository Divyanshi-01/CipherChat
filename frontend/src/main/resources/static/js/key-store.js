(function (window) {
    const DB_NAME = 'cipherchat';
    const DB_VERSION = 1;
    const IDENTITY_STORE = 'identity';
    const CONTACT_STORE = 'contacts';
    const IDENTITY_KEY = 'local-identity';

    class KeyStore {
        static open() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(IDENTITY_STORE)) {
                        db.createObjectStore(IDENTITY_STORE);
                    }
                    if (!db.objectStoreNames.contains(CONTACT_STORE)) {
                        db.createObjectStore(CONTACT_STORE);
                    }
                };

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        static async saveIdentity(identityRecord) {
            const db = await this.open();
            return this.put(db, IDENTITY_STORE, IDENTITY_KEY, identityRecord);
        }

        static async loadIdentity() {
            const db = await this.open();
            return this.get(db, IDENTITY_STORE, IDENTITY_KEY);
        }

        static async clearIdentity() {
            const db = await this.open();
            return this.delete(db, IDENTITY_STORE, IDENTITY_KEY);
        }

        static async saveContact(contact) {
            const db = await this.open();
            return this.put(db, CONTACT_STORE, contact.userId, contact);
        }

        static async loadContact(userId) {
            const db = await this.open();
            return this.get(db, CONTACT_STORE, userId);
        }

        static put(db, storeName, key, value) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).put(value, key);
                tx.oncomplete = () => resolve(value);
                tx.onerror = () => reject(tx.error);
            });
        }

        static get(db, storeName, key) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readonly');
                const request = tx.objectStore(storeName).get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        }

        static delete(db, storeName, key) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
    }

    window.KeyStore = KeyStore;
})(window);
