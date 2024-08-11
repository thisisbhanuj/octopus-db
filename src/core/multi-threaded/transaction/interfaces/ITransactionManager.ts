import { ITransaction } from "./ITransaction";
/**
 * Manages multiple transactions, allowing for starting, retrieving, and ending transactions.
 */
export interface ITransactionManager {
    startTransaction(): ITransaction;
    getTransaction(id: string): ITransaction;
    endTransaction(id: string): Promise<void>;
}
