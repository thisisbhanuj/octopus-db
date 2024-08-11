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
            const result = await octopusDB.sadd('SADDmyKey', 'myValue');
            console.log(`Result of SADD operation : SADDmyKey: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.sadd('SADDanotherKey', 'anotherValue');
            console.log(`Result of SADD operation : SADDanotherKey: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.rpush('RPUSHmyList', 'myValue');
            console.log(`Result of RPUSH operation: RPUSHmyList: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.rpush('RPUSHanotherList', 'anotherValue');
            console.log(`Result of RPUSH operation: RPUSHanotherList: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.get('GETmyKey');
            console.log(`Result of GET operation: GETmyKey: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.get('GETanotherKey');
            console.log(`Result of GET operation: GETanotherKey: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.lpop('LPOPmyList');
            console.log(`Result of LPOP operation: LPOPmyList: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.lpop('LPOPanotherList');
            console.log(`Result of LPOP operation: LPOPanotherList: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.set('SETmyKey', 'myNewValue');
            console.log(`Result of SET operation: SETmyKey: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.set('SETanotherKey', 'anotherNewValue');
            console.log(`Result of SET operation: SETanotherKey: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.rpush('RPUSHmyList', 'myNewValue');
            console.log(`Result of RPUSH operation: RPUSHmyList: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.rpush('RPUSHanotherList', 'anotherNewValue');
            console.log(`Result of RPUSH operation: RPUSHanotherList: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.get('GETmyKey');
            console.log(`Result of GET operation: GETmyKey: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.get('GETanotherKey');
            console.log(`Result of GET operation: GETanotherKey: ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.lpop('LPOPmyList');
            console.log(`Result of LPOP operation: LPOPmyList : ${result}`);
        })(),
        (async () => {
            const result = await octopusDB.lpop('LPOPanotherList');
            console.log(`Result of LPOP operation: LPOPanotherList: ${result}`);
        })(),
    ]);
})();
