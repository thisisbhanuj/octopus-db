import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { WorkerDataType } from '../../types/OctopusTypes';

class Octopus extends EventEmitter {
    private static instance: Octopus;

    private constructor() {
        super();
    }

    public static getInstance(): Octopus {
        if (!Octopus.instance) {
            Octopus.instance = new Octopus();
        }
        return Octopus.instance;
    }

    private runWorker(data: WorkerDataType): Promise<any> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(__filename, { workerData: data });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
    }

    public async set(key: string, value: string): Promise<string> {
        const result = await this.runWorker({ type: 'set', key, value });
        this.emit('operation', 'set', key, value);
        return result;
    }

    public async get(key: string): Promise<string | null> {
        const result = await this.runWorker({ type: 'get', key });
        this.emit('operation', 'get', key);
        return result;
    }

    public async del(key: string): Promise<number> {
        const result = await this.runWorker({ type: 'del', key });
        this.emit('operation', 'del', key);
        return result;
    }

    public async exists(key: string): Promise<number> {
        const result = await this.runWorker({ type: 'exists', key });
        this.emit('operation', 'exists', key);
        return result;
    }

    public async incr(key: string): Promise<string> {
        const result = await this.runWorker({ type: 'incr', key });
        this.emit('operation', 'incr', key);
        return result;
    }

    public async decr(key: string): Promise<string> {
        const result = await this.runWorker({ type: 'decr', key });
        this.emit('operation', 'decr', key);
        return result;
    }

    public async expire(key: string, seconds: number): Promise<number> {
        const result = await this.runWorker({ type: 'expire', key, seconds });
        this.emit('operation', 'expire', key);
        return result;
    }

    public async ttl(key: string): Promise<number> {
        const result = await this.runWorker({ type: 'ttl', key });
        this.emit('operation', 'ttl', key);
        return result;
    }
}

export default Octopus;
