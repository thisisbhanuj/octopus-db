import { AdvancedTask } from "../../../types/OctopusTypes";
import { BinaryHeapPriorityQueue } from "./BinaryHeapPriorityQueue";
import { ReentrantOctopusMutex } from "./ReentrantOctopusMutex";

/**
 * A queue that manages tasks with priorities and delayed execution.
 * Tasks are executed based on their priority and scheduled execution time.
 * 
 * @class AdvancedTaskQueue
 * @template T
 */
export class AdvancedTaskQueue<T> {
    /**
     * Internal queue storing tasks with their priorities and scheduled execution times.
     * 
     * Benefits:
     * - Efficiency: Both enqueue and dequeue operations run in O(log n) time, making the queue scalable even with a large number of tasks.
     * - Maintainability: The binary heap structure is simple and straightforward, making it easy to reason about and debug.
     * - Versatility: The priority queue can be adapted for different use cases by modifying the comparison logic in the compare method (e.g., to create a max-heap).
     * 
     * @private
     * @type {BinaryHeapPriorityQueue<AdvancedTask<T>>}
     */
    private queue: BinaryHeapPriorityQueue<AdvancedTask<T>>;

    /**
     * A set of task keys to ensure uniqueness and avoid duplicate tasks.
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
    private mutex = new ReentrantOctopusMutex();

    /**
     * Interval (in milliseconds) at which the queue is polled for executing delayed tasks.
     * 
     * @private
     * @type {number}
     * @default 100
     */
    private pollingInterval = 100;

    /**
     * Creates an instance of the AdvancedTaskQueue class.
     * Starts polling for tasks that need to be executed based on priority and delay.
     * 
     * @constructor
     * @public
     */
    constructor() {
        this.queue = new BinaryHeapPriorityQueue<AdvancedTask<T>>();
        this.startPolling();
    }

    /**
     * Starts polling the queue for tasks that are due for execution.
     * Tasks are executed when their scheduled time has arrived, respecting their priority.
     * 
     * @private
     * @memberof AdvancedTaskQueue
     * @returns {void}
     */
    private startPolling() {
        setInterval(async () => {
            await this.mutex.lock();
            try {
                const now = Date.now();
                while (this.queue.size() > 0 && this.queue.peek()?.executeAt <= now) {
                    const task = this.queue.dequeue();
                    if (task) {
                        this.taskSet.delete(JSON.stringify(task.task));
                        console.log('Executing task:', task.task);
                    }
                }
            } finally {
                this.mutex.unlock();
            }
        }, this.pollingInterval);
    }

    /**
     * Enqueues a task to be executed after a specified delay, with a given priority.
     * 
     * @param {T} task - The task to be added to the queue.
     * @param {number} [priority=0] - The priority of the task.
     * @param {number} [delay=0] - The delay in milliseconds before the task is executed.
     * @returns {Promise<void>} A promise that resolves when the task has been enqueued.
     */
    async enqueue(task: T, priority: number = 0, delay: number = 0): Promise<void> {
        const executeAt = Date.now() + delay;
        const taskKey = JSON.stringify(task);
        await this.mutex.lock();
        try {
            if (!this.taskSet.has(taskKey)) {
                this.queue.enqueue({ task, priority, executeAt }, priority);
                this.taskSet.add(taskKey);
            }
        } finally {
            this.mutex.unlock();
        }
    }

    /**
     * Dequeues the next task that is due for execution, considering its priority and execution time.
     * 
     * @returns {Promise<T | undefined>} A promise that resolves to the task or `undefined` if no tasks are ready.
     */
    async dequeue(): Promise<T | undefined> {
        await this.mutex.lock();
        try {
            const now = Date.now();
            const task = this.queue.dequeue();
            if (task?.executeAt <= now) {
                this.taskSet.delete(JSON.stringify(task.task));
                return task.task;
            } else if (task) {
                // If the task is not ready to execute, put it back
                this.queue.enqueue(task, task.priority);
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
        return this.queue.size();
    }
}