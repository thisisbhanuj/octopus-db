import { Worker } from 'worker_threads';
import { WorkerDataType } from '../../../types/OctopusTypes';

/**
 * WorkerPool Manages worker pooling and task queuing.
 */
export class WorkerPool {
    private workerPool: Worker[];
    private taskQueue: Array<(worker: Worker) => void> = [];
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
        this.workerPool = [];
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
        for (let i = 0; i < this.maxWorkers; i++) {
            //__filename is a special variable in Node.js that holds the absolute path of the current module file
            this.workerPool.push(new Worker(__filename.replace('workerPool', 'worker')));
        }
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
            // The main thread sends messages to the worker using worker.postMessage(data). 
            // This establishes a communication channel between the main thread and the worker.
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
     * @memberof WorkerPool
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
}
