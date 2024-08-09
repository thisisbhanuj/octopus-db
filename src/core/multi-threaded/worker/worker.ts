import { isMainThread, parentPort } from 'worker_threads';
import { WorkerDataType } from '../../../types/OctopusTypes';

// ******************************************************************************************************** //
//                                          Message Handling
//      The worker thread receives this message and uses type to determine which operation to perform.
//      The worker.ts script processes incoming messages and performs tasks based on the data received. 
//      After processing, it sends results back to the main thread using parentPort.postMessage(result).
// ******************************************************************************************************** //

if (!isMainThread) {
    //  In-Memory Store (store): A Map is used to store key-value pairs. 
    //  The value can be a string, number, list (array), or set depending on the operation.
    const store: Map<string, any> = new Map();
    //  TTL Management (ttlStore): A separate Map is used to manage time-to-live (TTL) for keys.
    //  When a key is set to expire, a timeout is set to remove it after the specified seconds.
    const ttlStore: Map<string, NodeJS.Timeout> = new Map();

    //  The worker thread is listening for messages via parentPort.on('message', ...). 
    //  The parentPort represents the communication channel between the main thread and this worker thread.
    // 'message' Event:
    //  The 'message' event is a standard event in the Node.js worker_threads module.
    //  It's used to handle incoming messages from the main thread to the worker thread.
    //  When you write parentPort!.on('message', ...), you're telling the worker to listen for messages sent from the main thread.
    parentPort.on('message', (data: WorkerDataType) => {
        let result: any;

        switch (data.type) {
            case 'set':
                store.set(data.key, data.value);
                result = 'OK';
                break;

            case 'get':
                result = store.get(data.key) || null;
                break;

            case 'del':
                result = store.delete(data.key) ? 1 : 0;
                break;

            case 'exists':
                result = store.has(data.key) ? 1 : 0;
                break;

            case 'incr':
                if (store.has(data.key)) {
                    const value = store.get(data.key);
                    if (typeof value === 'number') {
                        store.set(data.key, value + 1);
                        result = value + 1;
                    } else {
                        result = 'ERR value is not an integer';
                    }
                } else {
                    store.set(data.key, 1);
                    result = 1;
                }
                break;

            case 'decr':
                if (store.has(data.key)) {
                    const value = store.get(data.key);
                    if (typeof value === 'number') {
                        store.set(data.key, value - 1);
                        result = value - 1;
                    } else {
                        result = 'ERR value is not an integer';
                    }
                } else {
                    store.set(data.key, -1);
                    result = -1;
                }
                break;

            case 'expire':
                if (store.has(data.key)) {
                    if (ttlStore.has(data.key)) {
                        clearTimeout(ttlStore.get(data.key));
                    }
                    ttlStore.set(data.key, setTimeout(() => {
                        store.delete(data.key);
                        ttlStore.delete(data.key);
                    }, data.seconds * 1000));
                    result = 1;
                } else {
                    result = 0;
                }
                break;

            case 'ttl':
                if (ttlStore.has(data.key)) {
                    const remainingTime = Math.ceil((ttlStore.get(data.key) as any)._idleTimeout / 1000);
                    result = remainingTime;
                } else {
                    result = -1;
                }
                break;

            case 'listOp':
                switch (data.subType) {
                    case 'LPUSH':
                        if (!store.has(data.key)) {
                            store.set(data.key, []);
                        }
                        store.get(data.key).unshift(data.value);
                        result = store.get(data.key).length;
                        break;

                    case 'RPUSH':
                        if (!store.has(data.key)) {
                            store.set(data.key, []);
                        }
                        store.get(data.key).push(data.value);
                        result = store.get(data.key).length;
                        break;

                    case 'LPOP':
                        if (store.has(data.key) && Array.isArray(store.get(data.key))) {
                            result = store.get(data.key).shift()!;
                        } else {
                            result = null;
                        }
                        break;

                    case 'RPOP':
                        if (store.has(data.key) && Array.isArray(store.get(data.key))) {
                            result = store.get(data.key).pop()!;
                        } else {
                            result = null;
                        }
                        break;
                }
                break;

            case 'setOp':
                switch (data.subType) {
                    case 'SADD':
                        if (!store.has(data.key)) {
                            store.set(data.key, new Set());
                        }
                        result = store.get(data.key).add(data.value).size;
                        break;

                    case 'SREM':
                        if (store.has(data.key) && store.get(data.key) instanceof Set) {
                            result = store.get(data.key).delete(data.value) ? 1 : 0;
                        } else {
                            result = 0;
                        }
                        break;

                    case 'SMEMBERS':
                        if (store.has(data.key) && store.get(data.key) instanceof Set) {
                            result = Array.from(store.get(data.key));
                        } else {
                            result = [];
                        }
                        break;
                }
                break;
        }

        parentPort.postMessage(result);
    });
}
// ****************************************************