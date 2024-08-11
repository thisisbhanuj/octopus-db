import { ITransaction } from "../interfaces/ITransaction";
import { ITransactionManager } from "../interfaces/ITransactionManager";
import { Transaction } from "./Transaction";

/**
 * Manages transactions and provides methods for transaction lifecycle management.
 */
export class TransactionManager implements ITransactionManager {
    private transactions: Map<string, ITransaction> = new Map();
    private transactionIdCounter: number = 0;

    /**
    * Starts a new transaction and returns the transaction object.
    * @returns The transaction object.
    */
    startTransaction(): ITransaction {
        const id = (++this.transactionIdCounter).toString();
        const transaction = new Transaction(id);
        this.transactions.set(id, transaction);
        transaction.begin();
        console.debug('Transaction started:', id);
        return transaction;
    }

    /**
    * Returns the transaction object for the given transaction ID.
    * @param id The transaction ID.
    * @returns The transaction object.
    */
    getTransaction(id: string): ITransaction {
        return this.transactions.get(id);
    }

    async endTransaction(id: string): Promise<void> {
        const transaction = this.transactions.get(id);
        if (transaction) {
            await transaction.commit();
            console.debug('Transaction committed:', id);
            this.transactions.delete(id);
        } else {
            throw new Error('Transaction not found');
        }
    }

    /**
     * Rolls back a transaction with the given ID.
     * @param id The transaction ID.
     * @returns A promise that resolves when the transaction is rolled back.
     */
    async rollbackTransaction(id: string): Promise<void> {
        const transaction = this.transactions.get(id);
        if (transaction) {
            console.debug('Rolling back transaction:', id);
            await transaction.rollback();
            console.debug('Transaction rolled back complete:', id);
            this.transactions.delete(id);
        } else {
            throw new Error('Transaction not found');
        }
    }
}