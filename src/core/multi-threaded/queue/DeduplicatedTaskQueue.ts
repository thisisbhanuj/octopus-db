import { OctopusMutex } from "./OctopusMutex";

/**
 * A task queue that ensures tasks are unique by using a deduplication mechanism.
 * Each task is uniquely identified and only one instance of each task is allowed in the queue.
 * 
 * @class DeduplicatedTaskQueue
 * @template T
 */
export class DeduplicatedTaskQueue<T> {
    /**
     * Internal queue storing tasks.
     * 
     * @private
     * @type {T[]}
     */
    private queue: T[] = [];

    /**
     * Set for tracking unique task identifiers.
     * 
     * @private
     * @type {Set<string>}
     */
    private taskSet: Set<string> = new Set();

    /**
     * Mutex for ensuring thread-safe operations on the queue.
     * 
     * @private
     * @type {OctopusMutex}
     */
    private mutex = new OctopusMutex();

    /**
     * Enqueues a task if it is not already present in the queue.
     * Uses JSON serialization to create a unique identifier for the task.
     * 
     * @param {T} task - The task to be added to the queue.
     * @returns {Promise<void>} A promise that resolves when the task has been enqueued.
     */
    async enqueue(task: T): Promise<void> {
        const taskKey = JSON.stringify(task); // Task key to ensure uniqueness
        await this.mutex.lock();
        try {
            if (!this.taskSet.has(taskKey)) {
                this.queue.push(task);
                this.taskSet.add(taskKey);
            }
        } finally {
            this.mutex.unlock();
        }
    }

    /**
     * Dequeues the first task from the queue and removes its identifier from the set.
     * 
     * @returns {Promise<T | undefined>} A promise that resolves to the task or `undefined` if the queue is empty.
     */
    async dequeue(): Promise<T | undefined> {
        await this.mutex.lock();
        try {
            const task = this.queue.shift();
            if (task) {
                const taskKey = JSON.stringify(task);
                this.taskSet.delete(taskKey);
            }
            return task;
        } finally {
            this.mutex.unlock();
        }
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
