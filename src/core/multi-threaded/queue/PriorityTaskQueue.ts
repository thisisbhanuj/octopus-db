import { OctopusMutex } from "./OctopusMutex";

/**
 * Represents a task with an associated priority.
 * 
 * @interface PriorityTask
 * @template T
 */
interface PriorityTask<T> {
    /**
     * The task to be executed.
     * 
     * @type {T}
     */
    task: T;

    /**
     * The priority of the task. Lower values indicate higher priority.
     * 
     * @type {number}
     */
    priority: number;
}

/**
 * A priority-based task queue that manages tasks with associated priorities.
 * Tasks with lower priority values are processed before those with higher values.
 * 
 * @class PriorityTaskQueue
 * @template T
 */
export class PriorityTaskQueue<T> {
    /**
     * Internal queue storing tasks and their priorities.
     * 
     * @private
     * @type {PriorityTask<T>[]}
     */
    private queue: PriorityTask<T>[] = [];

    /**
     * Mutex for ensuring thread-safe operations on the queue.
     * 
     * @private
     * @type {OctopusMutex}
     */
    private mutex = new OctopusMutex();

    /**
     * Enqueues a task with a specified priority. Tasks are sorted in ascending order of priority.
     * 
     * @param {T} task - The task to be added to the queue.
     * @param {number} [priority=0] - The priority of the task. Default is 0.
     * @returns {Promise<void>} A promise that resolves when the task has been enqueued.
     */
    async enqueue(task: T, priority: number = 0): Promise<void> {
        await this.mutex.lock();
        try {
            this.queue.push({ task, priority });
            this.queue.sort((a, b) => a.priority - b.priority); // Sort by priority
        } finally {
            this.mutex.unlock();
        }
    }

    /**
     * Dequeues the highest priority task from the queue.
     * 
     * @returns {Promise<T | undefined>} A promise that resolves to the highest priority task or `undefined` if the queue is empty.
     */
    async dequeue(): Promise<T | undefined> {
        await this.mutex.lock();
        try {
            const item = this.queue.shift();
            return item?.task;
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
