import { VersionedData } from "./VersionedData";

/**
 * An Optimistic Concurrency Control (OCC) handler for managing versioned data.
 * 
 * In the context of Optimistic Concurrency Control (OCC), 
 * the traditional concept of transactions, such as start, commit, and rollback, 
 * is replaced by version validation and conflict handling. 
 * 
 * Key Differences Between OCC and Traditional Transactions
 * - Version Validation:
 * OCC primarily focuses on validating that the version of the data hasn't changed since it was read. This ensures that the data hasn't been modified by other transactions. If the version is out-of-date, the operation is aborted and typically retried, often with a conflict resolution strategy.
 * - Transaction-Like Behavior in OCC: 
 * While OCC does not explicitly use start, commit, and rollback, you can still implement these concepts to manage complex operations or multi-step processes where atomicity is required.
 */
export class OCCHandler<T extends VersionedData> {
    private dataStore: Map<number, T> = new Map();

    // getData is a method that's passed in through the constructor of the OCCHandler class, 
    // and it's expected to be provided by the class that instantiates OCCHandler.
    // The idea is that the OCCHandler doesn't directly manage the data itself; instead, 
    // it relies on the getData method provided to it to fetch the data. 
    // This method is necessary to perform operations and version control on that data.
    constructor(private getData: (id: number) => T) {}

    /**
     * Validates the version of the data before performing an operation.
     * 
     * @param id The unique identifier of the data.
     * @param expectedVersion The expected version of the data.
     * @returns {boolean} Whether the version is valid.
     */
    validateVersion(id: number, expectedVersion: number): boolean {
        const data = this.getData(id);
        return data ? data.version === expectedVersion : false;
    }

    /**
     * Performs an operation on the data if the version is valid.
     * 
     * @param workerId The unique identifier of the worker.
     * @param expectedVersion The expected version of the data.
     * @param operation The operation to perform on the data.
     * @throws {Error} If the version is invalid or if the operation fails.
     */
    async performOperation(workerId: number, expectedVersion: number, operation: (data: T) => Promise<void>): Promise<void> {
        // Validate the version of the data before performing the operation.
        if (!this.validateVersion(workerId, expectedVersion)) {
            console.error('Conflict detected: data has been modified');
            Promise.reject(new Error('Conflict detected: data has been modified'));
        }

        const data = this.getData(workerId);

        try {
            await operation(data);
            this.incrementVersion(workerId);
        } catch (error) {
            console.error('Operation failed:', error);
            Promise.reject(new Error('Operation failed'));
        }
    }

    /**
     * Increments the version of the data.
     * 
     * @param id The unique identifier of the data.
     */
    private incrementVersion(id: number): void {
        const data = this.getData(id);
        if (data) {
            data.version += 1;
        }
        console.log('Data version incremented:', data);
    }
}
