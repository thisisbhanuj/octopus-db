import { ReentrantOctopusMutex } from "../../queue/ReentrantOctopusMutex";
import { ITransaction } from "../interfaces/ITransaction";

/**
 * Manages operations within a transaction and handles commit and rollback logic. Uses ReentrantOctopusMutex for concurrency control.
 */
export class Transaction implements ITransaction {
    private operations: (() => Promise<any>)[] = [];
    private mutex: ReentrantOctopusMutex;
    private id: string;
    private isCommitted: boolean = false;

    /**
     * Creates a new transaction with the given ID.
     * @param id The transaction ID.
     */
    constructor(id: string) {
        this.id = id;
        this.mutex = new ReentrantOctopusMutex();
    }

    /**
     * Starts & locks the transaction to prevent concurrent access.
     */
    async begin(): Promise<void> {
        await this.mutex.lock();
    }

    /**
     * Adds an operation to the transaction.
     * @param operation The operation to add.
     */
    addOperation(operation: () => Promise<any>): void {
        if (this.isCommitted) {
            throw new Error('Transaction already committed');
        }
        this.operations.push(operation);
    }

    /**
     * Commits the transaction by executing all operations in sequence.
     */
    async commit(): Promise<void> {
        if (this.isCommitted) {
            throw new Error('Transaction already committed');
        }
        this.isCommitted = true;
        // Execute all operations in sequence
        try {
            for (const operation of this.operations) {
                await operation();
            }
        } catch (error) {
            await this.rollback();
            throw error;
        } finally {
            this.mutex.unlock();
        }
    }

    /**
     * Rolls back the transaction by clearing all operations.
     */
    async rollback(): Promise<void> {
        if (this.isCommitted) {
            throw new Error('Cannot roll back after commit');
        }
        this.operations = [];
        console.log('Rolling back operations for transaction:', this.id);
    }

    /**
     * Returns the transaction ID.
     * @returns The transaction ID.
     */
    getId(): string {
        return this.id;
    }
}