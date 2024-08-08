export interface WorkerDataType {
    type: 'set' | 'get' | 'del' | 'exists' | 'incr' | 'decr' | 'expire' | 'ttl';
    key: string;
    value?: string;
    seconds?: number;
}