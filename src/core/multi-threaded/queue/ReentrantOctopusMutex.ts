// ************************************************************************************************* //
// Key Points
// Reentrancy: The mutex allows a thread to acquire the lock multiple times. Each call to lock increments a count for that thread.
// Release Mechanism: unlock only releases the lock when the thread has released it as many times as it acquired it. It throws an error if the lock is being released by a thread that doesn’t own it.
// Fairness and Queueing: The mutex uses a queue to handle waiting threads, ensuring that threads acquire the lock in the order they requested it.
// Thread Identification: Implement getCurrentThreadId to return a unique identifier for the current thread or process. This implementation assumes a placeholder method for thread identification.
// ************************************************************************************************* //

import { workerData } from 'worker_threads';

/**
* ### Octopus Reentrant Mutex
* To implement reentrant locking in a multi-threaded environment,
* you'll need to ensure that the same thread or process can acquire 
* the lock multiple times without causing a deadlock or other issues.
* 
* ### Key Concepts for Reentrant Locking
* - Reentrant Mutex: Allows a thread to acquire the same lock multiple times. This is typically done by tracking the number of times the lock has been acquired by the same thread.
* - Thread Tracking: Maintain a record of the thread or process that currently holds the lock and how many times it has acquired the lock.
* - Release on Last Unlock: The lock is only fully released when the thread that originally acquired it has released it as many times as it acquired it.
**/
export class ReentrantOctopusMutex {
    private queue: Array<() => void> = [];
    private locked = false;
    private lockCount = new Map<number, number>(); // Tracks lock count per thread
    private currentOwner: number | null = null;

    /**
     * Acquires the mutex lock. Allows reentrant locking by the same thread.
     * @returns {Promise<void>} A promise that resolves when the lock is acquired.
     */
    async lock(): Promise<void> {
        const currentThreadId = this.getCurrentThreadId();

        if (this.currentOwner === currentThreadId) {
            // Increment lock count if the same thread already owns the lock
            this.lockCount.set(currentThreadId, (this.lockCount.get(currentThreadId) ?? 0) + 1);
            return;
        }

        if (this.locked) {
            // Queue the request if the lock is held by another thread
            await new Promise<void>(resolve => this.queue.push(resolve));
        }

        this.locked = true;
        this.currentOwner = currentThreadId;
        this.lockCount.set(currentThreadId, (this.lockCount.get(currentThreadId) ?? 0) + 1);
    }

    /**
     * Releases the mutex lock. Only releases if the current thread has released all its acquisitions.
     * @returns {Promise<void>} A promise that resolves when the lock is released.
     */
    unlock(): void {
        const currentThreadId = this.getCurrentThreadId();

        if (this.currentOwner !== currentThreadId) {
            throw new Error('Current thread does not own the lock');
        }

        // Get the current lock count for the thread
        const currentCount = this.lockCount.get(currentThreadId) ?? 0;

        if (currentCount > 1) {
            // Decrement the lock count if the thread acquired it multiple times
            this.lockCount.set(currentThreadId, currentCount - 1);
            return;
        }

        // Release the lock if the thread has no more acquisitions
        this.lockCount.delete(currentThreadId);

        if (this.queue.length > 0) {
            // Release the lock to the next waiting thread
            this.queue.shift()?.();
        } else {
            // Reset the lock state if no threads are waiting
            this.locked = false;
            this.currentOwner = null;
        }
    }

    /**
     * Gets the current thread identifier. This function needs to be implemented based on your environment.
     * @returns {number} The current thread ID.
     */
    private getCurrentThreadId(): number {
        return workerData?.c_threadId ?? 0; // addWorkerToPool() adds a c_threadId property to workerData
    }
}
