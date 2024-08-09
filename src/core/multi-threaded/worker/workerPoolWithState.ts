import { Worker } from 'worker_threads';
import { WorkerDataType, WorkerMetadata, WorkerState } from '../../../types/OctopusTypes';
import { AdvancedTaskQueue } from '../queue/AdvancedTaskQueue';
import { OctupusReentrantMutex } from '../queue/OctopusReentrantMutex';

/**
 * WorkerPool manages a pool of worker threads and task queuing.
 * 
 * This class integrates `AdvancedTaskQueue` to efficiently manage worker threads and their tasks.
 * It handles worker lifecycle, task queuing, and task processing with support for priorities and delays.
 *
 * ### Key Integrations and Concepts:
 *
 * 1. **AdvancedTaskQueue Integration**:
 *    - Uses `AdvancedTaskQueue` for advanced task management with priorities and delays.
 *    - Handles asynchronous task dequeuing.
 *
 * 2. **Worker Pool Management**:
 *    - Uses a `Map` to manage workers with their states.
 *    - Tracks available workers with a `Set`.
 *    - Manages worker states (`idle`, `busy`, `terminated`).
 *
 * 3. **Task Execution**:
 *    - The `runWorker` method executes tasks, considering priority and delay.
 *    - Handles worker errors and exits to maintain stability.
 *
 * 4. **Queue Processing**:
 *    - `processQueue` picks and assigns tasks to available workers based on priority and delay.
 *
 * ### Integration Process
 *
 * 1. **Initialization**:
 *    - Instantiates worker threads up to `maxWorkers`.
 *
 * 2. **Task Enqueuing**:
 *    - Enqueues tasks if no workers are available, based on priority and delay.
 *
 * 3. **Task Dequeuing and Execution**:
 *    - Processes tasks when workers are available.
 *
 * 4. **Worker State Management**:
 *    - Updates worker states and manages errors and exits.
 *
 * ### Benefits
 *
 * - **Scalability**: Efficiently handles a large number of tasks and workers.
 * - **Resilience**: Gracefully handles worker failures.
 * - **Flexibility**: Supports advanced queuing features for various use cases.
 **/
export class WorkerPool {
    // Why Map?
    // Tracking: Easily track and manage workers by their unique identifiers.
    // State Management: You can track worker states (active, idle, etc.) or additional metadata.
    // Dynamic Management: Add or remove workers dynamically based on their state or other criteria.
    private workerPoolMap: Map<number, { worker: Worker; metadata: WorkerMetadata }> = new Map();
    private availableWorkers: Set<number> = new Set();
    private taskQueue: AdvancedTaskQueue<WorkerDataType>; // Replaces the simple array-based queue with AdvancedTaskQueue, allowing tasks to be enqueued with priorities and delays.
    private workerIdCounter: number = 0;
    private maxWorkers: number;
    // This implementation supports reentrant locking, ensuring that a thread can acquire the lock multiple times without causing deadlock.
    // Integrated into the WorkerPool to manage concurrency and avoid race conditions in worker state management and task processing.
    private mutex = new OctupusReentrantMutex(); 

    /**
     * Creates an instance of the WorkerPool class.
     * 
     * @param {number} maxWorkers The maximum number of worker threads to create.
     * @memberof WorkerPool
     * @constructor
     * @public
     * @returns {void}
     * */
    constructor(maxWorkers: number) {
        this.maxWorkers = maxWorkers;
        this.taskQueue = new AdvancedTaskQueue<WorkerDataType>();
        this.initializeWorkerPool();
    }

    /**
     * Initializes the worker pool with the maximum number of worker threads.
     * The path to worker.ts is provided when creating the Worker instance. 
     * The Node.js runtime handles the execution of this script in a separate thread, 
     * allowing for parallel processing and communication through messages.
     * 
     * - 'initializeWorkerPool` creates multiple Worker threads that execute the worker.ts script.
     * - worker.ts is automatically loaded and run by Node.js in separate threads as soon as the Worker instances are created.
     * - Path Handling: __filename.replace('workerPool', 'worker') dynamically constructs the path to worker.ts.
     * 
     * @private
     * @memberof WorkerPool
     */
    private initializeWorkerPool() {
        while (this.workerPoolMap.size < this.maxWorkers) {
            this.addWorkerToPool();
        }
    }

    /**
     * Adds a worker to the worker pool.
     * 
     * @private
     * @param {number} [workerId] The unique identifier for the worker (optional).
     * @param {string} [state='idle'] The initial state of the worker.
     * @memberof WorkerPool
     * @returns {void}
     */
    private addWorkerToPool(workerId: number = this.workerIdCounter++, state: keyof WorkerState = 'idle'): void {
        const worker = new Worker(__filename.replace('workerPool', 'worker'), {
            workerData: { c_threadId: workerId } // Passes the workerId to the worker data as c_threadId
        });
        this.workerPoolMap.set(workerId, {
            worker,
            metadata: { id: workerId, state }
        });
        this.availableWorkers.add(workerId);

        worker.once('message', async () => {
            await this.mutex.lock();
            this.workerPoolMap.get(workerId).metadata.state = 'idle'; // Update state to idle
            this.availableWorkers.add(workerId); // Return to available workers
            this.processQueue(); // Process the next task
            this.mutex.unlock();
        });

        worker.on('error', async (error) => {
            console.error('Worker encountered an error:', error);
            await this.mutex.lock();
            this.markWorkerAsIdleOrReset(workerId);
            this.processQueue();
            this.mutex.unlock();
        });

        worker.on('exit', async (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                await this.mutex.lock();
                this.removeWorker(workerId);
                // Add a new worker to the pool if the number of workers is less than the maximum
                if (this.workerPoolMap.size < this.maxWorkers) {
                    this.addWorkerToPool();
                }
                await this.processQueue();
                this.mutex.unlock();
            } else {
                await this.mutex.lock();
                this.markWorkerAsIdleOrReset(workerId);
                await this.processQueue();
                this.mutex.unlock();
            }
        });
    }

    /**
     * Marks a worker as idle or resets the worker pool.
     * 
     * @private
     * @param {number} workerId The unique identifier of the worker.
     * @memberof WorkerPool
     * @returns {void}
     */
    private markWorkerAsIdleOrReset(workerId: number) {
        const workerEntry = this.workerPoolMap.get(workerId);
        if (workerEntry && workerEntry.metadata.state !== 'terminated') {
            workerEntry.metadata.state = 'idle';
            this.availableWorkers.add(workerId);
        } else {
            this.removeWorker(workerId);
            if (this.workerPoolMap.size < this.maxWorkers) {
                this.addWorkerToPool();
            }
        }
    }

    /**
     * Removes a worker from the worker pool.
     * 
     * @private
     * @param {number} workerId The unique identifier of the worker.
     * @memberof WorkerPool
     * @returns {void}
     */
    private removeWorker(workerId: number): void {
        this.workerPoolMap.delete(workerId);
        this.availableWorkers.delete(workerId);
    }

    /**
     * Runs a worker thread to execute a key-value operation.
     * 
     * The runWorker method constructs a WorkerDataType object containing the 
     * operation type (type) and any other relevant data (e.g., key, value, etc.).
     * 
     * @example :
     *  const pool = new WorkerPool(4);
     *  // Normal task
     *  pool.runWorker({ type: 'set', key: 'a', value: 1 });
     *  // High priority task
     *  pool.runWorker({ type: 'get', key: 'a' }, 10);
     *  // Delayed task (execute after 5 seconds)
     *  pool.runWorker({ type: 'delete', key: 'a' }, 0, 5000);
     * 
     * @param {WorkerDataType} data The operation data to send to the worker thread.
     * @returns {Promise<any>} The result of the operation.
     * @memberof Octopus
     */
    async runWorker(data: WorkerDataType, priority: number = 0, delay: number = 0): Promise<any> {
        if(this.availableWorkers.size === 0) {
            return new Promise((resolve, reject) => {
                this.taskQueue.enqueue(data, priority, delay).then(() => {
                    this.processQueue();
                });
            });
        }

        const workerId = Array.from(this.availableWorkers.values()).shift();
        if (!workerId) {
            throw new Error('No available worker');
        }

        const workerEntry = this.workerPoolMap.get(workerId);
        if (!workerEntry || workerEntry.metadata.state === 'terminated') {
            throw new Error('Worker not found');
        }
    
        const worker = workerEntry.worker;
        workerEntry.metadata.state = 'busy'; // Update the worker state to busy
        this.availableWorkers.delete(workerId); // Remove the worker from the available workers set

        return new Promise((resolve, reject) => {
            // The main thread sends messages to the worker using worker.postMessage(data). 
            // This establishes a communication channel between the main thread and the worker.
            worker.postMessage(data);

            // Listen for a message from the worker thread (successful result)
            worker.once('message', async (message) => {
                // Return the worker to the pool, as it is now idle
                await this.mutex.lock();
                this.addWorkerToPool(workerId, 'idle');
                this.processQueue(); // Process the next task in the queue
                this.mutex.unlock();
                resolve(message);
            });

            worker.once('error', async (error) => {
                console.error('Worker encountered an error:', error);
                await this.mutex.lock();
                this.markWorkerAsIdleOrReset(workerId);
                this.processQueue();
                this.mutex.unlock();
                reject(error);
            });

            worker.once('exit', async (code) => {
                if (code !== 0) {
                    console.error(`Worker stopped with exit code ${code}`);
                    await this.mutex.lock();
                    this.removeWorker(workerId);
                    if (this.workerPoolMap.size < this.maxWorkers) {
                        this.addWorkerToPool();
                    }
                    await this.processQueue();
                    this.mutex.unlock();
                } else {
                    await this.mutex.lock();
                    this.markWorkerAsIdleOrReset(workerId);
                    await this.processQueue();
                    this.mutex.unlock();
                }
            });
        });
    }

    /**
     * Processes the next task in the queue, if available.
     * 
     * @private
     * @memberof WorkerPool
     * @returns {void}
     */
    private async processQueue(): Promise<void> {
        if (this.taskQueue.size() > 0 && this.availableWorkers.size > 0) {
            const task = await this.taskQueue.dequeue();
            if (task) {
                const workerId = Array.from(this.availableWorkers.values()).shift();
                const workerEntry = workerId ? this.workerPoolMap.get(workerId) : undefined;
                if (workerEntry && workerEntry.metadata.state === 'idle') {
                    this.runWorker(task);
                }
            }
        }
    }
}
