# Octopus Queue
Custom implements in-house atomic, thread-safe and performant queue.

## Goal
To create a lightweight queue implementation tailored to our custom multi-threaded Redis-like database, here's how we can approach it:

### Requirements:
1. **Lightweight**: Minimal dependencies, efficient in terms of memory and CPU.
2. **Thread-Safe**: Concurrent access to the queue should be safe.
3. **FIFO (First-In-First-Out)**: Maintain the order of tasks.
4. **Scalable**: Should handle a growing number of tasks without significant performance degradation.

### Implementation Ideas:
1. **Simple FIFO Queue with Locks**:
   - Implement a basic FIFO queue using an array or linked list.
   - Use Node.js built-in synchronization mechanisms like `Mutex` to ensure thread-safety.
   - This approach is simple and fits the lightweight requirement.

2. **Priority Queue**:
   - If you need to prioritize tasks, a priority queue could be implemented using a binary heap or a sorted array.
   - This adds some complexity but allows more control over task execution order.

3. **Task De-Duplication**:
   - If necessary, prevent duplicate tasks from being queued.
   - Use a `Set` to track unique tasks.

4. **Queue with Delay**:
   - Implement delayed task execution by adding timestamps to tasks.
   - Poll the queue at intervals to check if any tasks are due for execution.

### Example: Basic FIFO Queue Implementation

```typescript
class TaskQueue<T> {
    private queue: T[] = [];
    private mutex = new Mutex();

    async enqueue(task: T): Promise<void> {
        await this.mutex.lock();
        try {
            this.queue.push(task);
        } finally {
            this.mutex.unlock();
        }
    }

    async dequeue(): Promise<T | undefined> {
        await this.mutex.lock();
        try {
            return this.queue.shift();
        } finally {
            this.mutex.unlock();
        }
    }

    size(): number {
        return this.queue.length;
    }
}
```

### Considerations:
- **Mutex Usage**: Ensures that only one thread can enqueue or dequeue at a time.
- **Queue Operations**: `enqueue` adds a task to the end, and `dequeue` removes it from the front, maintaining FIFO order.
- **Thread-Safety**: Mutex ensures thread-safe operations, but it might add some overhead. If performance is a concern, optimizing the locking mechanism or using atomic operations could be explored.

## AdvancedTaskQueue
### AdvancedTaskQueue : Manages tasks with priorities and delayed execution. Tasks are executed based on their priority and the time they are due.
- startPolling Method: Periodically checks the queue and executes tasks that are due, ensuring they are executed based on their scheduled time and priority.
- enqueue Method: Adds tasks to the queue with a specified delay and priority. Ensures no duplicate tasks are added.
- dequeue Method: Removes and returns the next task that is ready to be executed.
- size Method: Returns the number of tasks in the queue.
- AdvancedTask Interface: Represents a task with a priority and scheduled execution time.

### Conclusion:
This approach keeps the queue implementation lightweight, thread-safe, and custom-built for our specific use case, avoiding the overhead and complexity of external libraries or Redis-backed solutions.