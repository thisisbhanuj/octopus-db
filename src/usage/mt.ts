import Octopus from "../core/multi-threaded/octopus";

const octopusDB = Octopus.getInstance();

// Set up a listener for 'operation' events before performing any operations
octopusDB.on('operation', (operationType, key, value) => {
    console.log(`Operation: ${operationType} performed on key: ${key} with value: ${value}`);
    // Add additional logic here if needed
});

(async () => {
    await Promise.all([
        (async () => {
            const result = await octopusDB.sadd('myKey', 'myValue');
            console.log(`Result of SADD operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.sadd('anotherKey', 'anotherValue');
            console.log(`Result of Another operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.rpush('myList', 'myValue');
            console.log(`Result of RPUSH operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.rpush('anotherList', 'anotherValue');
            console.log(`Result of Another operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.get('myKey');
            console.log(`Result of GET operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.get('anotherKey');
            console.log(`Result of Another operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.lpop('myList');
            console.log(`Result of LPOP operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.lpop('anotherList');
            console.log(`Result of Another operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.set('myKey', 'myNewValue');
            console.log(`Result of SCARD operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.set('anotherKey', 'anotherNewValue');
            console.log(`Result of Another operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.rpush('myList', 'myNewValue');
            console.log(`Result of RPUSH operation: ${result}`);
        }
        )(),
        (async () => {
            const result = await octopusDB.rpush('anotherList', 'anotherNewValue');
            console.log(`Result of Another operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.get('myKey');
            console.log(`Result of GET operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.get('anotherKey');
            console.log(`Result of Another operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.lpop('myList');
            console.log(`Result of LPOP operation: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.lpop('anotherList');
            console.log(`Result of Another operation: ${result}`);
        })(),
    ]);
})();

// Expected Output:
// $ ts-node src/usage/mt.ts
// *****************************************************
// Available workers: Set(8) { 0, 1, 2, 3, 4, 5, 6, 7 }
// Worker ID: 0
// Running worker with data: { type: 'setOp', key: 'myKey', subType: 'SADD', value: 'myValue' }
// Priority: 0
// Delay: 0
// *****************************************************
// *****************************************************
// Available workers: Set(7) { 1, 2, 3, 4, 5, 6, 7 }
// Worker ID: 1
// Running worker with data: {
//   type: 'setOp',
//   key: 'anotherKey',
//   subType: 'SADD',
//   value: 'anotherValue'
// }
// Priority: 0
// Delay: 0
// *****************************************************
// *****************************************************
// Available workers: Set(6) { 2, 3, 4, 5, 6, 7 }
// Worker ID: 2
// Running worker with data: { type: 'listOp', key: 'myList', subType: 'RPUSH', value: 'myValue' }
// Priority: 0
// Delay: 0
// *****************************************************
// *****************************************************
// Available workers: Set(5) { 3, 4, 5, 6, 7 }
// Worker ID: 3
// Running worker with data: {
//   type: 'listOp',
//   key: 'anotherList',
//   subType: 'RPUSH',
//   value: 'anotherValue'
// }
// Priority: 0
// Delay: 0
// *****************************************************
// *****************************************************
// Available workers: Set(4) { 4, 5, 6, 7 }
// Worker ID: 4
// Running worker with data: { type: 'get', key: 'myKey' }
// Priority: 0
// Delay: 0
// *****************************************************
// *****************************************************
// Available workers: Set(3) { 5, 6, 7 }
// Worker ID: 5
// Running worker with data: { type: 'get', key: 'anotherKey' }
// Priority: 0
// Delay: 0
// *****************************************************
// *****************************************************
// Available workers: Set(2) { 6, 7 }
// Worker ID: 6
// Running worker with data: { type: 'listOp', key: 'myList', subType: 'LPOP' }
// Priority: 0
// Delay: 0
// *****************************************************
// *****************************************************
// Available workers: Set(1) { 7 }
// Worker ID: 7
// Running worker with data: { type: 'listOp', key: 'anotherList', subType: 'LPOP' }      
// Priority: 0
// Delay: 0
// *****************************************************
// No available workers. Enqueuing task:  { type: 'set', key: 'myKey', value: 'myNewValue' }
// No available workers. Enqueuing task:  { type: 'set', key: 'anotherKey', value: 'anotherNewValue' }
// No available workers. Enqueuing task:  {
//   type: 'listOp',
//   key: 'myList',
//   subType: 'RPUSH',
//   value: 'myNewValue'
// }
// No available workers. Enqueuing task:  {
//   type: 'listOp',
//   key: 'anotherList',
//   subType: 'RPUSH',
//   value: 'anotherNewValue'
// }
// No available workers. Enqueuing task:  { type: 'get', key: 'myKey' }
// No available workers. Enqueuing task:  { type: 'get', key: 'anotherKey' }
// No available workers. Enqueuing task:  { type: 'listOp', key: 'myList', subType: 'LPOP' }
// No available workers. Enqueuing task:  { type: 'listOp', key: 'anotherList', subType: 'LPOP' }
// Processing queue...
// Processing queue...
// Processing queue...
// Processing queue...
// Processing queue...
// Processing queue...
// Processing queue...
// Processing queue...
// f(addWorkerToPool) Worker 1 initialized: 0
// Worker 1 success message: 1
// f(addWorkerToPool) : Lock acquired for worker: 0
// f(addWorkerToPool) Worker returned to pool: 0
// Releasing lock for worker: 0
// Processing queue...
// Lock acquired for worker: 0
// Worker returned to pool: 0
// Releasing lock for worker: 0
// Processing queue...
// Operation: sadd performed on key: myKey with value: myValue
// Result of SADD operation: 1
// f(addWorkerToPool) Worker 2 initialized: 1
// Worker 2 success message: 1
// f(addWorkerToPool) : Lock acquired for worker: 1
// f(addWorkerToPool) Worker returned to pool: 1
// Releasing lock for worker: 1
// Processing queue...
// Lock acquired for worker: 1
// Worker returned to pool: 1
// Releasing lock for worker: 1
// Processing queue...
// Operation: sadd performed on key: anotherKey with value: anotherValue
// Result of Another operation: 1
// f(addWorkerToPool) Worker 3 initialized: 2
// Worker 3 success message: 1
// f(addWorkerToPool) : Lock acquired for worker: 2
// f(addWorkerToPool) Worker returned to pool: 2
// Releasing lock for worker: 2
// Processing queue...
// Lock acquired for worker: 2
// Worker returned to pool: 2
// Releasing lock for worker: 2
// Processing queue...
// Operation: rpush performed on key: myList with value: myValue
// Result of RPUSH operation: 1
// f(addWorkerToPool) Worker 4 initialized: 3
// Worker 4 success message: 1
// f(addWorkerToPool) : Lock acquired for worker: 3
// f(addWorkerToPool) Worker returned to pool: 3
// Releasing lock for worker: 3
// Processing queue...
// Lock acquired for worker: 3
// Worker returned to pool: 3
// Releasing lock for worker: 3
// Processing queue...
// Operation: rpush performed on key: anotherList with value: anotherValue
// Result of Another operation: 1
// f(addWorkerToPool) Worker 5 initialized: 4
// Worker 5 success message: null
// f(addWorkerToPool) : Lock acquired for worker: 4
// f(addWorkerToPool) Worker returned to pool: 4
// Releasing lock for worker: 4
// Processing queue...
// Lock acquired for worker: 4
// Worker returned to pool: 4
// Releasing lock for worker: 4
// Processing queue...
// Operation: get performed on key: myKey with value: undefined
// Result of GET operation: null
// f(addWorkerToPool) Worker 7 initialized: 6
// Worker 7 success message: null
// f(addWorkerToPool) : Lock acquired for worker: 6
// f(addWorkerToPool) Worker returned to pool: 6
// Releasing lock for worker: 6
// Processing queue...
// Lock acquired for worker: 6
// Worker returned to pool: 6
// Releasing lock for worker: 6
// Processing queue...
// Operation: lpop performed on key: myList with value: undefined
// Result of LPOP operation: null
// f(addWorkerToPool) Worker 8 initialized: 7
// Worker 8 success message: null
// f(addWorkerToPool) : Lock acquired for worker: 7
// f(addWorkerToPool) Worker returned to pool: 7
// Releasing lock for worker: 7
// Processing queue...
// Lock acquired for worker: 7
// Worker returned to pool: 7
// Releasing lock for worker: 7
// Processing queue...
// Operation: lpop performed on key: anotherList with value: undefined
// Result of Another operation: null
// f(addWorkerToPool) Worker 6 initialized: 5
// Worker 6 success message: null
// f(addWorkerToPool) : Lock acquired for worker: 5
// f(addWorkerToPool) Worker returned to pool: 5
// Releasing lock for worker: 5
// Processing queue...
// Lock acquired for worker: 5
// Worker returned to pool: 5
// Releasing lock for worker: 5
// Processing queue...
// Operation: get performed on key: anotherKey with value: undefined
// Result of Another operation: null

