/**
 * Defines methods for transaction lifecycle management (begin, commit, rollback).
 */
export interface ITransaction {
    begin(): Promise<void>;
    addOperation(operation: () => Promise<any>): void;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    getId(): string;
}