class KVStore {
    private store: Map<string, string>;
    private ttlStore: Map<string, number>;
    private static instance: KVStore;

    private constructor() {
        this.store = new Map<string, string>();
        this.ttlStore = new Map<string, number>();
    }

    // Singleton pattern
    public static getInstance(): KVStore {
        if (!KVStore.instance) {
            KVStore.instance = new KVStore();
        }
        return KVStore.instance;
    }

    // Set a key-value pair
    public set(key: string, value: string): string {
        this.store.set(key, value);
        return 'OK';
    }

    // Get the value of a key
    public get(key: string): string | null {
        this.checkExpiration(key);
        return this.store.get(key) || null;
    }

    // Delete a key
    public del(key: string): number {
        this.ttlStore.delete(key);
        return this.store.delete(key) ? 1 : 0;
    }

    // Check if a key exists
    public exists(key: string): number {
        this.checkExpiration(key);
        return this.store.has(key) ? 1 : 0;
    }

    // Increment the integer value of a key by one
    public incr(key: string): string {
        this.checkExpiration(key);
        const value = this.store.get(key);
        if (!value || isNaN(Number(value))) {
            throw new Error('Key does not hold an integer');
        }
        const newValue = (parseInt(value) + 1).toString();
        this.store.set(key, newValue);
        return newValue;
    }

    // Decrement the integer value of a key by one
    public decr(key: string): string {
        this.checkExpiration(key);
        const value = this.store.get(key);
        if (!value || isNaN(Number(value))) {
            throw new Error('Key does not hold an integer');
        }
        const newValue = (parseInt(value) - 1).toString();
        this.store.set(key, newValue);
        return newValue;
    }

    // Set a key's time to live in seconds
    public expire(key: string, seconds: number): number {
        if (!this.store.has(key)) {
            return 0;
        }
        const expireAt = Date.now() + seconds * 1000;
        this.ttlStore.set(key, expireAt);
        return 1;
    }

    // Get the time to live for a key
    public ttl(key: string): number {
        this.checkExpiration(key);
        const expireAt = this.ttlStore.get(key);
        if (!expireAt) {
            return -1;
        }
        const ttl = Math.floor((expireAt - Date.now()) / 1000);
        return ttl >= 0 ? ttl : -1;
    }

    // Check if a key has expired and delete it if it has
    private checkExpiration(key: string): void {
        const expireAt = this.ttlStore.get(key);
        if (expireAt && Date.now() > expireAt) {
            this.store.delete(key);
            this.ttlStore.delete(key);
        }
    }
}

export default KVStore;
