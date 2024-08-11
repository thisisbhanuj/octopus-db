import { VersionedData } from "./VersionedData";

export class OCCHandler<T extends VersionedData> {
    private dataStore: Map<number, T> = new Map();

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
    }
}
