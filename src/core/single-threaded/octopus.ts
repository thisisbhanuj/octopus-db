import { EventEmitter } from 'events';

/**
 * A simple key-value store with support for time-to-live (TTL) on keys.
 * It can achieve high throughput because it can handle a large number of 
 * requests per second due to its efficient event loop & non-blocking I/O operations.
 * 
 * Explanation:
 * - EventEmitter: We use Node.js's EventEmitter to handle events, which simulates an event loop for our key-value operations.
 * - Async Methods: All key-value operations (set, get, del, exists, incr, decr, expire, ttl) are now asynchronous, using async/await to simulate non-blocking behavior.
 * - Logging Operations: We added a listener for the operation event to log operations, which helps in understanding the flow and debugging.
 * 
 * @class Octopus
 * @extends {EventEmitter}
 */
class Octopus extends EventEmitter {
    private store: Map<string, string>;
    private ttlStore: Map<string, number>;
    private static instance: Octopus;

    private constructor() {
        super();
        this.store = new Map<string, string>();
        this.ttlStore = new Map<string, number>();
    }

    // Singleton pattern
    public static getInstance(): Octopus {
        if (!Octopus.instance) {
            Octopus.instance = new Octopus();
        }
        return Octopus.instance;
    }

    // Set a key-value pair
    public async set(key: string, value: string): Promise<string> {
        this.store.set(key, value);
        this.emit('operation', 'set', key, value);
        return 'OK';
    }

    // Get the value of a key
    public async get(key: string): Promise<string | null> {
        this.checkExpiration(key);
        this.emit('operation', 'get', key);
        return this.store.get(key) || null;
    }

    // Delete a key
    public async del(key: string): Promise<number> {
        this.ttlStore.delete(key);
        const result = this.store.delete(key) ? 1 : 0;
        this.emit('operation', 'del', key);
        return result;
    }

    // Check if a key exists
    public async exists(key: string): Promise<number> {
        this.checkExpiration(key);
        this.emit('operation', 'exists', key);
        return this.store.has(key) ? 1 : 0;
    }

    // Increment the integer value of a key by one
    public async incr(key: string): Promise<string> {
        this.checkExpiration(key);
        const value = this.store.get(key);
        if (!value || isNaN(Number(value))) {
            throw new Error('Key does not hold an integer');
        }
        const newValue = (parseInt(value) + 1).toString();
        this.store.set(key, newValue);
        this.emit('operation', 'incr', key);
        return newValue;
    }

    // Decrement the integer value of a key by one
    public async decr(key: string): Promise<string> {
        this.checkExpiration(key);
        const value = this.store.get(key);
        if (!value || isNaN(Number(value))) {
            throw new Error('Key does not hold an integer');
        }
        const newValue = (parseInt(value) - 1).toString();
        this.store.set(key, newValue);
        this.emit('operation', 'decr', key);
        return newValue;
    }

    // Set a key's time to live in seconds
    public async expire(key: string, seconds: number): Promise<number> {
        if (!this.store.has(key)) {
            return 0;
        }
        const expireAt = Date.now() + seconds * 1000;
        this.ttlStore.set(key, expireAt);
        this.emit('operation', 'expire', key);
        return 1;
    }

    // Get the time to live for a key
    public async ttl(key: string): Promise<number> {
        this.checkExpiration(key);
        const expireAt = this.ttlStore.get(key);
        if (!expireAt) {
            return -1;
        }
        const ttl = Math.floor((expireAt - Date.now()) / 1000);
        this.emit('operation', 'ttl', key);
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

export default Octopus;
