/**
 * A simple mutex implementation using promises for synchronization.
 * 
 * ### 1. Atomicity
 * - **Atomicity** means that the operations for locking and unlocking should be indivisible and complete in a single step. This is crucial to ensure that no two threads can acquire the lock simultaneously.
 * - **In `OctopusMutex`:** The implementation uses promises and the `queue` to handle locking. Each `lock` request is queued, and the `unlock` operation resolves the next promise in the queue. This approach ensures that once a promise is resolved, it is effectively an atomic operation in the sense that only one thread can proceed with the lock at a time. However, the atomicity of the `unlock` operation relies on the underlying JavaScript runtime and the promise handling mechanism, which generally ensures atomicity.
 * 
 * ### 2. Deadlock Avoidance
 * - **Deadlock Avoidance** means ensuring that threads do not end up waiting indefinitely for each other to release locks.
 * - **In `OctopusMutex`:** The design does not inherently prevent all forms of deadlock, but it avoids classic deadlocks related to mutex locks by ensuring that locks are granted in a controlled and queued manner. However, if your system has complex lock dependencies (e.g., multiple mutexes), additional deadlock avoidance strategies might be required. This implementation focuses on handling individual lock requests fairly.
 * 
 * ### 3. Reentrant Locks
 * - **Reentrant Locks** allow the same thread to acquire the lock multiple times without causing a deadlock.
 * - **In `OctopusMutex`:** This implementation does not support reentrant locking. Once a thread acquires the lock, it is not designed to allow the same thread to acquire it again. If reentrancy is required, you would need to extend the mutex to track the number of acquisitions by the same thread and manage the lock accordingly.
 * 
 * ### 4. Fairness
 * - **Fairness** ensures that all threads get a chance to acquire the lock in the order they requested it, avoiding starvation.
 * - **In `OctopusMutex`:** Fairness is addressed by using a queue to manage lock requests. Threads are queued and granted the lock in the order they arrive. This design aims to ensure that each thread eventually gets the lock without indefinite starvation.
 * 
 * ### Summary
 * - **Atomicity:** The implementation uses promises to handle atomic lock acquisition and release effectively.
 * - **Deadlock Avoidance:** The design is straightforward and prevents basic deadlocks related to individual mutexes but might need enhancements for complex scenarios.
 * - **Reentrant Locks:** The current implementation does not support reentrancy.
 * - **Fairness:** The use of a queue ensures that threads are granted the lock in the order they requested it, promoting fairness.
 */
export class OctopusMutex {
    // The queue of tasks waiting to acquire the lock.
    private queue: Array<() => void> = [];
    private locked = false;

    async lock(): Promise<void> {
        if (this.locked) {
            // If it is locked, the method adds a new promise to the queue. 
            // This promise will be resolved when the lock becomes available. 
            // By adding the resolve function to the queue, you ensure that 
            // the next task in line can be granted the lock once it is freed.
            await new Promise<void>(resolve => this.queue.push(resolve));
        }
        this.locked = true;
    }

    unlock(): void {
        const resolveLock = this.queue.shift();
        if (resolveLock) {
            // If there are tasks waiting in the queue, the method resolves the first one.
            resolveLock();
        } else {
            this.locked = false;
        }
    }
}
    