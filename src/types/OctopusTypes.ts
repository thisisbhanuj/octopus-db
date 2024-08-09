export type WorkerDataType = {
    type: 'set' | 'get' | 'del' | 'exists' | 'incr' | 'decr' | 'expire' | 'ttl' | 'listOp' | 'setOp' | 'persist';
    key: string;
    value?: any;
    subType?: 'LPUSH' | 'RPUSH' | 'LPOP' | 'RPOP' | 'SADD' | 'SREM' | 'SMEMBERS';
    seconds?: number;
};