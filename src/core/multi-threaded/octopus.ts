import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { WorkerDataType } from '../../types/OctopusTypes';

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
 * @class Octopus
 * @extends {EventEmitter}
 */
class Octopus extends EventEmitter {
    private static instance: Octopus;

    /**
     * Private constructor to prevent direct instantiation (singleton pattern).
     * 
     * @private
     * @memberof Octopus
     */
    private constructor() {
        super();
    }

    /**
     * Retrieves the singleton instance of the Octopus class.
     * 
     * @static
     * @returns {Octopus} The singleton instance.
     * @memberof Octopus
     */
    public static getInstance(): Octopus {
        if (!Octopus.instance) {
            Octopus.instance = new Octopus();
        }
        return Octopus.instance;
    }

    /**
     * Runs a worker thread to execute a key-value operation.
     * 
     * @private
     * @param {WorkerData} data The operation data to send to the worker thread.
     * @returns {Promise<any>} The result of the operation.
     * @memberof Octopus
     */
    private runWorker(data: WorkerDataType): Promise<any> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(__filename, { workerData: data });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
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
        const result = await this.runWorker({ type: 'set', key, value });
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
        const result = await this.runWorker({ type: 'get', key });
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
        const result = await this.runWorker({ type: 'del', key });
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
        const result = await this.runWorker({ type: 'exists', key });
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
        const result = await this.runWorker({ type: 'incr', key });
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
        const result = await this.runWorker({ type: 'decr', key });
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
        const result = await this.runWorker({ type: 'expire', key, seconds });
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
        const result = await this.runWorker({ type: 'ttl', key });
        this.emit('operation', 'ttl', key);
        return result;
    }
}

export default Octopus;
