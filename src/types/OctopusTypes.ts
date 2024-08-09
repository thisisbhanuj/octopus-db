export type WorkerDataType = {
    type: 'set' | 'get' | 'del' | 'exists' | 'incr' | 'decr' | 'expire' | 'ttl' | 'listOp' | 'setOp' | 'persist';
    key: string;
    value?: any;
    subType?: 'LPUSH' | 'RPUSH' | 'LPOP' | 'RPOP' | 'SADD' | 'SREM' | 'SMEMBERS';
    seconds?: number;
};

export interface WorkerMetadata {
    id: number;
    state: keyof WorkerState;
}

export interface WorkerState {
    idle: 'idle';
    busy: 'busy';
    terminated: 'terminated';
}

/**
* Interface representing an advanced task with priority and a scheduled execution time.
* 
* @interface AdvancedTask
* @template T
*/
export interface AdvancedTask<T> {
   /**
    * The task to be executed.
    * 
    * @type {T}
    */
   task: T;

   /**
    * The priority of the task, used for sorting tasks with the same execution time.
    * 
    * @type {number}
    */
   priority: number;

   /**
    * The Unix timestamp (in milliseconds) at which the task should be executed.
    * 
    * @type {number}
    */
   executeAt: number;
}

export interface HeapNode<T> {
    task: T;
    priority: number;
}