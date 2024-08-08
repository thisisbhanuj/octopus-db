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
    private workerPool: Worker[];
    private taskQueue: Array<(worker: Worker) => void>;
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
        this.maxWorkers = maxWorkers! > 0 ? maxWorkers! : Octopus.defaultNumWorkers;
        this.workerPool = [];
        this.taskQueue = [];
        this.initializeWorkerPool();
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
     * Initializes the worker pool with the maximum number of worker threads.
     * 
     * @private
     * @memberof Octopus
     */
    private initializeWorkerPool(): void {
        for (let i = 0; i < this.maxWorkers; i++) {
            this.workerPool.push(new Worker(__filename));
        }
    }

    /**
     * Runs a worker thread to execute a key-value operation.
     * 
     * @private
     * @param {WorkerDataType} data The operation data to send to the worker thread.
     * @returns {Promise<any>} The result of the operation.
     * @memberof Octopus
     */
    private async runWorker(data: WorkerDataType): Promise<any> {
        const worker = this.workerPool.shift(); // Get a worker from the pool

        if (!worker) {
            // No available workers, add the task to the queue
            return new Promise((resolve, reject) => {
                this.taskQueue.push(() => {
                    this.runWorker(data).then(resolve).catch(reject);
                });
            });
        }

        return new Promise((resolve, reject) => {
            worker.postMessage(data);

            // Listen for a message from the worker thread (successful result)
            worker.once('message', (message) => {
                this.workerPool.push(worker); // Return the worker to the pool
                this.processQueue(); // Process the next task in the queue
                resolve(message);
            });

            // Listen for an error from the worker thread
            worker.once('error', (error) => {
                console.error('Worker encountered an error:', error);
                this.workerPool.push(worker); // Return the worker to the pool even on error
                this.processQueue(); // Process the next task in the queue
                reject(error);
            });

            // Ensure the worker is returned to the pool if it exits without errors
            worker.once('exit', (code) => {
                if (code !== 0) {
                    console.error(`Worker stopped with exit code ${code}`);
                }
                this.workerPool.push(worker); // Return the worker to the pool
                this.processQueue(); // Process the next task in the queue
            });
        });
    }

    /**
     * Processes the next task in the queue, if available.
     * 
     * @private
     * @memberof Octopus
     * @returns {void}
     */
    private processQueue(): void {
        if (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            if (task) {
                task(this.workerPool[0]); // Execute the next task
            }
        }
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
