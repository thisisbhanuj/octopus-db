import { OctopusMutex } from "./OctopusMutex";

/**
 * A queue that manages tasks with delayed execution.
 * Tasks are executed at a specified time in the future.
 * 
 * @class DelayedTaskQueue
 * @template T
 */
export class DelayedTaskQueue<T> {
    /**
     * Internal queue storing tasks along with their scheduled execution time.
     * 
     * @private
     * @type {DelayedTask<T>[]}
     */
    private queue: DelayedTask<T>[] = [];

    /**
     * Mutex for ensuring thread-safe operations on the queue.
     * 
     * @private
     * @type {OctopusMutex}
     */
    private mutex = new OctopusMutex();

    /**
     * Interval (in milliseconds) at which the queue is polled for executing delayed tasks.
     * 
     * @private
     * @type {number}
     * @default 100
     */
    private pollingInterval = 100; // Poll every 100ms

    /**
     * Creates an instance of the DelayedTaskQueue class.
     * Starts polling for tasks that need to be executed.
     * 
     * @constructor
     * @public
     */
    constructor() {
        this.startPolling();
    }

    /**
     * Starts polling the queue for tasks that are due for execution.
     * Tasks are executed when their scheduled time has arrived.
     * 
     * @private
     * @memberof DelayedTaskQueue
     * @returns {void}
     */
    private startPolling() {
        setInterval(async () => {
            await this.mutex.lock();
            try {
                const now = Date.now();
                while (this.queue.length > 0 && this.queue[0].executeAt <= now) {
                    const task = this.queue.shift();
                    if (task) {
                        // Handle task execution
                        console.log('Executing task:', task.task);
                    }
                }
            } finally {
                this.mutex.unlock();
            }
        }, this.pollingInterval);
    }

    /**
     * Enqueues a task to be executed after a specified delay.
     * 
     * @param {T} task - The task to be added to the queue.
     * @param {number} [delay=0] - The delay in milliseconds before the task is executed.
     * @returns {Promise<void>} A promise that resolves when the task has been enqueued.
     */
    async enqueue(task: T, delay: number = 0): Promise<void> {
        const executeAt = Date.now() + delay;
        await this.mutex.lock();
        try {
            this.queue.push({ task, executeAt });
            this.queue.sort((a, b) => a.executeAt - b.executeAt); // Sort by execute time
        } finally {
            this.mutex.unlock();
        }
    }

    /**
     * Dequeues the next task that is due for execution.
     * 
     * @returns {Promise<T | undefined>} A promise that resolves to the task or `undefined` if no tasks are ready.
     */
    async dequeue(): Promise<T | undefined> {
        await this.mutex.lock();
        try {
            const now = Date.now();
            if (this.queue.length > 0 && this.queue[0].executeAt <= now) {
                return this.queue.shift()?.task;
            }
        } finally {
            this.mutex.unlock();
        }
        return undefined;
    }

    /**
     * Returns the number of tasks currently in the queue.
     * 
     * @returns {number} The number of tasks in the queue.
     */
    size(): number {
        return this.queue.length;
    }
}

/**
 * Interface representing a delayed task with a scheduled execution time.
 * 
 * @interface DelayedTask
 * @template T
 */
interface DelayedTask<T> {
    /**
     * The task to be executed.
     * 
     * @type {T}
     */
    task: T;

    /**
     * The Unix timestamp (in milliseconds) at which the task should be executed.
     * 
     * @type {number}
     */
    executeAt: number;
}
