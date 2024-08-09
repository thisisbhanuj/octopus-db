/**
 * A simple mutex implementation using promises for synchronization.
 */
export class OctopusMutex {
    private mutex = Promise.resolve();

    /**
     * Acquires the mutex lock. If the lock is already held, the returned promise will resolve once the lock is available.
     * @returns {Promise<void>} A promise that resolves when the lock is acquired.
     */
    lock(): any {
        let begin: (unlock: () => void) => void = (unlock: () => void) => {};
        this.mutex = this.mutex.then(() => new Promise(begin));
        return new Promise(res => begin = res);
    }

    /**
     * Releases the mutex lock.
     * @returns {Promise<void>} A promise that resolves when the lock is released.
     */
    async unlock(): Promise<void> {
        await this.mutex;
    }
}