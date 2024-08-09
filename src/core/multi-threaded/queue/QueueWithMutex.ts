import { OctopusMutex } from "./OctopusMutex";

/**
 * A thread-safe task queue using a mutex for synchronization.
 * @template T - The type of tasks in the queue.
 */
export class TaskQueue<T> {
    private queue: T[] = []; // Basic FIFO Queue
    private mutex = new OctopusMutex();

    /**
     * Adds a task to the queue.
     * @param {T} task - The task to be added to the queue.
     * @returns {Promise<void>} A promise that resolves when the task has been added.
     */
    async enqueue(task: T): Promise<void> {
        await this.mutex.lock();
        try {
            this.queue.push(task);
        } finally {
            this.mutex.unlock();
        }
    }

    /**
     * Removes and returns the first task from the queue.
     * @returns {Promise<T | undefined>} A promise that resolves with the first task in the queue, or undefined if the queue is empty.
     */
    async dequeue(): Promise<T | undefined> {
        await this.mutex.lock();
        try {
            return this.queue.shift();
        } finally {
            this.mutex.unlock();
        }
    }

    /**
     * Returns the number of tasks in the queue.
     * @returns {number} The number of tasks in the queue.
     */
    size(): number {
        return this.queue.length;
    }
}
