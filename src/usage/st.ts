import Octopus from "../core/single-threaded/octopus";

const redis = Octopus.getInstance();

redis.on('operation', (operation: string, key: string, value: string) => {
    console.log(`Operation: ${operation}, Key: ${key}, Value: ${value}`);
});

(async () => {
    console.log(await redis.set('name', 'Alice')); // OK
    console.log(await redis.get('name')); // Alice
    console.log(await redis.del('name')); // 1
    console.log(await redis.get('name')); // null
    console.log(await redis.exists('name')); // 0
    console.log(await redis.set('counter', '10')); // OK
    console.log(await redis.incr('counter')); // 11
    console.log(await redis.decr('counter')); // 10
    console.log(await redis.expire('counter', 5)); // 1
    setTimeout(async () => {
        console.log(await redis.ttl('counter')); // Should be 0 or -1 after expiration
    }, 6000);
})();
