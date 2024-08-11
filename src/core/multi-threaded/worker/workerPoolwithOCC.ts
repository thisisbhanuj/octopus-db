import { Worker } from 'worker_threads';
import { WorkerDataType, WorkerMetadata, WorkerState } from '../../../types/OctopusTypes';
import { AdvancedTaskQueue } from '../queue/AdvancedTaskQueue';
import path from 'path';
import { OCCHandler } from '../occ/interfaces/OCCHandler';

/**
 * WorkerPool manages a pool of worker threads and task queuing.
 * 
 * - Worker Management:
 * 1. Initialization: Creates and initializes worker threads up to a specified maximum (maxWorkers).
 * 2. Lifecycle Management: Adds, removes, and manages worker states (idle, busy, terminated).
 * - Task Handling:
 * 1. Task Queuing: Uses AdvancedTaskQueue to handle tasks with priorities and delays.
 * 2. Task Execution: Executes tasks by assigning them to available workers, considering their current state.
 * - Concurrency Control: OCC Integration: Uses OCCHandler to manage optimistic concurrency control, ensuring data consistency during task execution.
 * - Error Handling: Worker Errors: Handles worker errors and exits, re-adding workers if needed.
 * - Queue Processing: Automatic Task Assignment: Processes tasks from the queue when workers become available.
 *
 * ### Benefits
 * - **Scalability**: Efficiently handles a large number of tasks and workers.
 * - **Resilience**: Gracefully handles worker failures.
 * - **Flexibility**: Supports advanced queuing features for various use cases.
 **/
export class WorkerPoolOCC {
    // Why Map?
    // Tracking: Easily track and manage workers by their unique identifiers.
    // State Management: You can track worker states (active, idle, etc.) or additional metadata.
    // Dynamic Management: Add or remove workers dynamically based on their state or other criteria.
    private workerPoolMap: Map<number, { worker: Worker; metadata: WorkerMetadata }> = new Map();
    private availableWorkers: Set<number> = new Set();
    private taskQueue: AdvancedTaskQueue<WorkerDataType>; // Replaces the simple array-based queue with AdvancedTaskQueue, allowing tasks to be enqueued with priorities and delays.
    private workerIdCounter: number = 0;
    private maxWorkers: number;
    private occHandler: OCCHandler<WorkerMetadata>;

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
        this.occHandler = new OCCHandler<WorkerMetadata>(this.getWorkerMetadata.bind(this)); // The OCCHandler is initialized with a function that retrieves the metadata of a worker based on its unique identifier.
        this.initializeWorkerPool();
    }

    /**
     * Retrieves the metadata of a worker based on its unique identifier.
     * 
     * @private
     * @param {number} id The unique identifier of the worker.
     * @returns {WorkerMetadata} The metadata of the worker.
     * @memberof WorkerPool
     */
    private getWorkerMetadata(id: number): WorkerMetadata {
        const workerEntry = this.workerPoolMap.get(id);
        return workerEntry ? workerEntry.metadata : null;
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
        // **********************************************************
        // Construct the path to the worker script, which will be executed in a separate thread.
        // Had issue with the __filename.replace('workerPool', 'worker') typescipt loading,
        // so convertte .ts to .js and used path.resolve to get the worker.js path.
        // ERROR : import { isMainThread, parentPort } from 'worker_threads';
        // ^^^^^^
        // SyntaxError: Cannot use import statement outside a module
        // **********************************************************
        const workerPath = path.resolve(__dirname, 'worker.js');
        const worker = new Worker(workerPath, {
            workerData: { c_threadId: workerId } // Passes the workerId to the worker data as c_threadId
        });
        this.workerPoolMap.set(workerId, {
            worker,
            metadata: { id: workerId, state, version: 0 }
        });
        this.availableWorkers.add(workerId);

        worker.once('message', async () => {
            console.debug(`f(addWorkerToPool) Worker ${worker.threadId} initialized:`, workerId);
            try {
                this.workerPoolMap.get(workerId).metadata.state = 'idle';// Update state to idle
                this.availableWorkers.add(workerId); // Return to available workers
            } catch (error) {
                console.error('Error during worker initialization:', error);
            } finally {
                // Process the next task in the queue without holding the lock
                this.processQueue();
            }
        });        
        worker.on('error', async (error) => this.handleWorkerError(workerId, error));
        worker.on('exit', async (code) => this.handleWorkerExit(workerId, code));
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
        console.debug('Removing worker:', workerId);
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
     * @param {number} [priority=0] The priority of the task (default is 0).
     * @param {number} [delay=0] The delay in milliseconds before executing the task (default is 0).
     * @returns {Promise<any>} The result of the operation.
     * @memberof Octopus
     */
    async runWorker(data: WorkerDataType, priority: number = 0, delay: number = 0): Promise<any> {
        if(this.availableWorkers.size === 0) {
            console.debug('No available workers. Enqueuing task: ', data);
            return new Promise((resolve, reject) => {
                this.taskQueue.enqueue(data, priority, delay).then(() => {
                    this.processQueue();
                });
            });
        }
        const workerId = Array.from(this.availableWorkers.values()).shift();

        console.debug('*****************************************************')
        console.debug('Available workers:', this.availableWorkers);
        console.debug('Worker ID:', workerId);
        console.debug('Running worker with data:', data);
        console.debug('Priority:', priority);
        console.debug('Delay:', delay);
        console.debug('*****************************************************')

        if (this.workerPoolMap.has(workerId)) {
            const workerEntry = this.workerPoolMap.get(workerId);
            if (!workerEntry || workerEntry.metadata.state === 'terminated') {
                throw new Error('Worker not found');
            }

            const currentVersion = workerEntry.metadata.version;

            try{
                // Perform the operation using optimistic concurrency control
                await this.occHandler.performOperation(workerId, currentVersion, async (metadata) => {
                    // Perform task execution
                    const worker = workerEntry.worker;
                    metadata.state = 'busy'; // Update the worker state to busy
                    this.availableWorkers.delete(workerId); // Remove the worker from the available workers set

                    // Send the data to the worker thread
                    worker.postMessage(data);

                    return new Promise((resolve, reject) => {
                        // Handle the response from the worker thread
                        worker.once('message', (message) => {
                            console.debug(`Worker ${workerId} result : ${message}`);
                            this.addWorkerToPool(workerId, 'idle'); // Add the worker back to the pool
                            this.availableWorkers.add(workerId); // Return to available workers
                            resolve(message);
                        });
                        // Handle errors and exits
                        worker.once('error', (error) => {
                            this.handleWorkerError(workerId, error);
                            reject(error);
                        });
                        worker.once('exit', (code) => {
                            this.handleWorkerExit(workerId, code);
                            reject(new Error('Worker exited unexpectedly'));
                        });
                    });
                });
            } catch (error) {
                console.error('OCC failed:', error);
                throw new Error(error);
            } finally {
                this.processQueue();
            }
        } else {
            throw new Error('Worker not found');
        }
    }

    /**
     * Processes the next task in the queue, if available.
     * 
     * @private
     * @memberof WorkerPool
     * @returns {void}
     */
    private async processQueue(): Promise<void> {
        console.debug('Processing queue...');
        if (this.taskQueue.size() > 0 && this.availableWorkers.size > 0) {
            const task = await this.taskQueue.dequeue();
            if (task) {
                const workerId = Array.from(this.availableWorkers.values()).shift();
                const workerEntry = workerId ? this.workerPoolMap.get(workerId) : undefined;
                if (workerEntry && workerEntry.metadata.state === 'idle') {
                    console.debug('Processing task from queue: ', task);
                    this.runWorker(task);
                }
            }
        }
    }

    /**
     * Handles worker errors.
     * 
     * @param workerId  The unique identifier of the worker.
     * @param error   The error encountered by the worker.
     */
    private handleWorkerError(workerId: number, error: Error) {
        console.error('Worker encountered an error:', error);
        try {
            this.removeWorker(workerId);
                if (this.workerPoolMap.size < this.maxWorkers) {
                    this.addWorkerToPool();
                }  
        } catch (error) {
            console.error('Error during worker error handling:', error);
        }
        this.processQueue();  
    }
    
    /**
     * Handles worker exits.
     * 
     * @param workerId  The unique identifier of the worker.
     * @param code   The exit code of the worker.
     */
    private handleWorkerExit(workerId: number, code: number) {
        try {
            if (code !== 0) {
                this.removeWorker(workerId);
                    if (this.workerPoolMap.size < this.maxWorkers) {
                        this.addWorkerToPool();
                    }
            } else {
                this.markWorkerAsIdleOrReset(workerId);
            }
        } catch (error) {
            console.error('Error during worker exit handling:', error);
        }
           
        this.processQueue();
    }
}
