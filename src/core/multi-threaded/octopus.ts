import { EventEmitter } from 'events';
import { WorkerPool } from './worker/workerPoolWithTransaction';

/**
 * Octopus is a singleton key-value store with support for time-to-live (TTL) on keys.
 * It utilizes Node.js worker threads to achieve high throughput by running key-value operations
 * concurrently in multiple threads, simulating multi-threaded behavior.
 * 
 * Features:
 * - Event-driven architecture using EventEmitter for logging and debugging.
 * - Asynchronous, non-blocking methods for all operations.
 * - Supports basic key-value operations, TTL management, and atomic increments/decrements.
 * - Multi-threaded operation using Node.js worker threads.
 * 
 * Explanation:
 * - Worker Management: The runWorker method is responsible for managing workers, 
 *      running a specific operation on a new thread, and returning the result.
 * - Worker Logic: The worker logic is executed only if isMainThread is false. 
 *      Each worker performs the operation based on the type provided and 
 *      sends the result back to the main thread using parentPort.
 * - Performance Consideration: Each operation now runs in a separate thread, 
 *      which means you can handle multiple operations in parallel. 
 *      However, remember that spawning too many threads might lead to context-switching overhead, 
 *      so it's often necessary to balance the number of workers with your system's capacity.
 * 
 * Thread Pooling:
 * To implement a thread pool, we'll limit the number of worker threads to avoid excessive creation. It involves:
 * - Creating a pool of worker threads that can be reused.
 * - Managing the queue of tasks waiting for a worker thread to become available.
 * 
 * @class Octopus
 * @extends {EventEmitter}
 */
class Octopus extends EventEmitter {
    private static instance: Octopus;
    private workerPool: WorkerPool;
    private maxWorkers: number;
    private static readonly defaultNumWorkers: number = 8;

    /**
     * Private constructor to prevent direct instantiation (singleton pattern).
     * 
     * @private
     * @memberof Octopus
     * @param {number} maxWorkers The maximum number of worker threads to create.
     */
    private constructor(maxWorkers?: number) {
        super();
        this.maxWorkers = maxWorkers > 0 ? maxWorkers : Octopus.defaultNumWorkers;
        this.workerPool = new WorkerPool(maxWorkers);
    }

    /**
     * Retrieves the singleton instance of the Octopus class.
     * 
     * @static
     * @param {number} [maxWorkers=8] The maximum number of worker threads to create.
     * @returns {Octopus} The singleton instance.
     * @memberof Octopus
     */
    public static getInstance(maxWorkers: number = Octopus.defaultNumWorkers): Octopus {
        if (!Octopus.instance) {
            Octopus.instance = new Octopus(maxWorkers);
        }
        return Octopus.instance;
    }

    /**
     * Retrieves the number     of worker threads in the pool.
     * 
     * @private
     * @returns {number} The number of worker threads.
     * @memberof Octopus
     * */
    public getWorkerCount(): number {
        return this.maxWorkers;
    }

    /**
     * Sets a key-value pair in the store.
     * 
     * @param {string} key The key to set.
     * @param {string} value The value to associate with the key.
     * @returns {Promise<string>} 'OK' if the operation was successful.
     * @memberof Octopus
     */
    public async set(key: string, value: string): Promise<string> {
        const result = await this.workerPool.runWorker({ type: 'set', key, value });
        this.emit('operation', 'set', key, value);
        return result;
    }

    /**
     * Retrieves the value associated with a key.
     * 
     * @param {string} key The key to retrieve.
     * @returns {Promise<string | null>} The value, or null if the key does not exist.
     * @memberof Octopus
     */
    public async get(key: string): Promise<string | null> {
        const result = await this.workerPool.runWorker({ type: 'get', key });
        this.emit('operation', 'get', key);
        return result;
    }

    /**
     * Deletes a key from the store.
     * 
     * @param {string} key The key to delete.
     * @returns {Promise<number>} 1 if the key was deleted, 0 if the key did not exist.
     * @memberof Octopus
     */
    public async del(key: string): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'del', key });
        this.emit('operation', 'del', key);
        return result;
    }

    /**
     * Checks if a key exists in the store.
     * 
     * @param {string} key The key to check.
     * @returns {Promise<number>} 1 if the key exists, 0 if it does not.
     * @memberof Octopus
     */
    public async exists(key: string): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'exists', key });
        this.emit('operation', 'exists', key);
        return result;
    }

    /**
     * Increments the integer value of a key by one.
     * 
     * @param {string} key The key to increment.
     * @returns {Promise<string>} The new value after incrementing.
     * @memberof Octopus
     */
    public async incr(key: string): Promise<string> {
        const result = await this.workerPool.runWorker({ type: 'incr', key });
        this.emit('operation', 'incr', key);
        return result;
    }

    /**
     * Decrements the integer value of a key by one.
     * 
     * @param {string} key The key to decrement.
     * @returns {Promise<string>} The new value after decrementing.
     * @memberof Octopus
     */
    public async decr(key: string): Promise<string> {
        const result = await this.workerPool.runWorker({ type: 'decr', key });
        this.emit('operation', 'decr', key);
        return result;
    }

    /**
     * Sets a time-to-live (TTL) on a key in seconds.
     * 
     * @param {string} key The key to expire.
     * @param {number} seconds The TTL in seconds.
     * @returns {Promise<number>} 1 if the TTL was set, 0 if the key does not exist.
     * @memberof Octopus
     */
    public async expire(key: string, seconds: number): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'expire', key, seconds });
        this.emit('operation', 'expire', key);
        return result;
    }

    /**
     * Retrieves the time-to-live (TTL) remaining for a key.
     * 
     * @param {string} key The key to check.
     * @returns {Promise<number>} The TTL in seconds, or -1 if the key does not exist or has no TTL.
     * @memberof Octopus
     */
    public async ttl(key: string): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'ttl', key });
        this.emit('operation', 'ttl', key);
        return result;
    }

    /**
     * Removes the time-to-live (TTL) from a key, making it persistent.
     * 
     * @param {string} key The key to persist.
     * @returns {Promise<number>} 1 if the key was persisted, 0 if the key does not exist.
     * @memberof Octopus
     */
    public async persist(key: string): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'persist', key });
        this.emit('operation', 'persist', key);
        return result;
    }

    /**
     * Performs a left push operation on a list.
     * 
     * @param {string} key The key of the list.
     * @param {string} value The value to push.
     * @returns {Promise<number>} The new length of the list.
     * @memberof Octopus
     */
    public async lpush(key: string, value: string): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'listOp', key, subType: 'LPUSH', value });
        this.emit('operation', 'lpush', key, value);
        return result;
    }

    /**
     * Performs a right push operation on a list.
     * 
     * @param {string} key The key of the list.
     * @param {string} value The value to push.
     * @returns {Promise<number>} The new length of the list.
     * @memberof Octopus
     */
    public async rpush(key: string, value: string): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'listOp', key, subType: 'RPUSH', value });
        this.emit('operation', 'rpush', key, value);
        return result;
    }

    /**
     * Performs a left pop operation on a list.
     * 
     * @param {string} key The key of the list.
     * @returns {Promise<string | null>} The value popped from the list, or null if the list is empty.
     * @memberof Octopus
     */
    public async lpop(key: string): Promise<string | null> {
        const result = await this.workerPool.runWorker({ type: 'listOp', key, subType: 'LPOP' });
        this.emit('operation', 'lpop', key);
        return result;
    }

    /**
     * Performs a right pop operation on a list.
     * 
     * @param {string} key The key of the list.
     * @returns {Promise<string | null>} The value popped from the list, or null if the list is empty.
     * @memberof Octopus
     */
    public async rpop(key: string): Promise<string | null> {
        const result = await this.workerPool.runWorker({ type: 'listOp', key, subType: 'RPOP' });
        this.emit('operation', 'rpop', key);
        return result;
    }

    /**
     * Adds a value to a set.
     * 
     * @param {string} key The key of the set.
     * @param {string} value The value to add.
     * @returns {Promise<number>} The number of elements added to the set.
     * @memberof Octopus
     */
    public async sadd(key: string, value: string): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'setOp', key, subType: 'SADD', value });
        this.emit('operation', 'sadd', key, value);
        return result;
    }

    /**
     * Removes a value from a set.
     * 
     * @param {string} key The key of the set.
     * @param {string} value The value to remove.
     * @returns {Promise<number>} The number of elements removed from the set.
     * @memberof Octopus
     */
    public async srem(key: string, value: string): Promise<number> {
        const result = await this.workerPool.runWorker({ type: 'setOp', key, subType: 'SREM', value });
        this.emit('operation', 'srem', key, value);
        return result;
    }

    /**
     * Retrieves all members of a set.
     * 
     * @param {string} key The key of the set.
     * @returns {Promise<string[]>} An array of all members in the set.
     * @memberof Octopus
     */
    public async smembers(key: string): Promise<string[]> {
        const result = await this.workerPool.runWorker({ type: 'setOp', key, subType: 'SMEMBERS' });
        this.emit('operation', 'smembers', key);
        return result;
    }
}


export default Octopus;
