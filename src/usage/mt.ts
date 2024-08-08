import { isMainThread, parentPort, workerData } from 'worker_threads';
import Octopus from "../core/multi-threaded/octopus";
import { WorkerDataType } from '../types/OctopusTypes';

if (!isMainThread) {
    const kvStore = Octopus.getInstance(); // Reuse the singleton instance within each worker
    const { type, key, value, seconds } = workerData ?? {} as WorkerDataType;

    (async () => {
        try {
            switch (type) {
                case 'set':
                    parentPort?.postMessage(await kvStore.set(key, value));
                    break;
                case 'get':
                    parentPort?.postMessage(await kvStore.get(key));
                    break;
                case 'del':
                    parentPort?.postMessage(await kvStore.del(key));
                    break;
                case 'exists':
                    parentPort?.postMessage(await kvStore.exists(key));
                    break;
                case 'incr':
                    parentPort?.postMessage(await kvStore.incr(key));
                    break;
                case 'decr':
                    parentPort?.postMessage(await kvStore.decr(key));
                    break;
                case 'expire':
                    parentPort?.postMessage(await kvStore.expire(key, seconds));
                    break;
                case 'ttl':
                    parentPort?.postMessage(await kvStore.ttl(key));
                    break;
                default:
                    parentPort?.postMessage(null);
            }
        } catch (error) {
            if (error instanceof Error) parentPort?.postMessage({ error: error.message });
            console.error('Error in worker thread:', error);  
        }
    })();
}
