import Octopus from "../core/multi-threaded/octopus";

const octopusDB = Octopus.getInstance();

// Set up a listener for 'operation' events
octopusDB.on('operation', (operationType, key, value) => {
    console.log(`Operation: ${operationType} performed on key: ${key} with value: ${value}`);
    // Add additional logic here if needed
});

(async () => {
    const result = await octopusDB.sadd('myKey', 'myValue');
    console.log(`Result of SADD operation: ${result}`);
})();

