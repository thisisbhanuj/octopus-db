import { Worker } from 'worker_threads';
import { WorkerDataType, WorkerMetadata, WorkerState } from '../../../types/OctopusTypes';

/**
 * WorkerPool Manages worker pooling and task queuing.
 */
export class WorkerPool {
    // Why Map?
    // Tracking: Easily track and manage workers by their unique identifiers.
    // State Management: You can track worker states (active, idle, etc.) or additional metadata.
    // Dynamic Management: Add or remove workers dynamically based on their state or other criteria.
    private workerPoolMap: Map<number,  { worker: Worker; metadata: WorkerMetadata }> = new Map();
    private availableWorkers: Set<number> = new Set();
    private taskQueue: Array<(worker: Worker) => void> = [];
    private workerIdCounter: number = 0;
    private maxWorkers: number;

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
        const worker = new Worker(__filename.replace('workerPool', 'worker'));
        this.workerPoolMap.set(workerId, {
            worker,
            metadata: { id: workerId, state }
        });
        this.availableWorkers.add(workerId);

        worker.once('message', (message) => {
            this.workerPoolMap.get(workerId).metadata.state = 'idle'; // Update state to idle
            this.availableWorkers.add(workerId); // Return to available workers
            this.processQueue(); // Process the next task
        });

        worker.on('error', (error) => {
            console.error('Worker encountered an error:', error);
            this.markWorkerAsIdleOrReset(workerId);
            this.processQueue();
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                this.removeWorker(workerId);
                // Optionally recreate the worker if needed
                if (this.workerPoolMap.size < this.maxWorkers) {
                    this.addWorkerToPool();
                }
            } else {
                this.markWorkerAsIdleOrReset(workerId);
            }
            this.processQueue();
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
     * @param {WorkerDataType} data The operation data to send to the worker thread.
     * @returns {Promise<any>} The result of the operation.
     * @memberof Octopus
     */
    async runWorker(data: WorkerDataType): Promise<any> {
        if(this.availableWorkers.size === 0) {
            return new Promise((resolve, reject) => {
                this.taskQueue.push(() => {
                    this.runWorker(data).then(resolve).catch(reject);
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
            worker.once('message', (message) => {
                // Return the worker to the pool, as it is now idle
                this.addWorkerToPool(workerId, 'idle');
                this.processQueue(); // Process the next task in the queue
                resolve(message);
            });

            worker.once('error', (error) => {
                console.error('Worker encountered an error:', error);
                this.markWorkerAsIdleOrReset(workerId);
                this.processQueue();
                reject(error);
            });

            worker.once('exit', (code) => {
                if (code !== 0) {
                    console.error(`Worker stopped with exit code ${code}`);
                    this.removeWorker(workerId);
                } else {
                    this.markWorkerAsIdleOrReset(workerId);
                }
                this.processQueue();
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
    private processQueue(): void {
        if (this.taskQueue.length > 0 && this.availableWorkers.size > 0) {
            const task = this.taskQueue.shift();
            if (task) {
                const workerId = Array.from(this.availableWorkers.values()).shift();
                const workerEntry = workerId ? this.workerPoolMap.get(workerId) : undefined;
                if (workerEntry && workerEntry.metadata.state === 'idle') {
                    task(workerEntry.worker);
                }
            }
        }
    }

}
