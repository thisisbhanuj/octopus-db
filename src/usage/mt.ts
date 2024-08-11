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
    ]);
})();
