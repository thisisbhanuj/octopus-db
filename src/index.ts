import KVStore from "./core/store";

// Create an instance of the KVStore class
const store = KVStore.getInstance();

console.log(store.set('name', 'Alice')); // OK
console.log(store.get('name')); // Alice
console.log(store.del('name')); // 1
console.log(store.get('name')); // null
console.log(store.exists('name')); // 0
console.log(store.set('counter', '10')); // OK
console.log(store.incr('counter')); // 11
console.log(store.decr('counter')); // 10
console.log(store.expire('counter', 5)); // 1

setTimeout(() => {
    console.log(store.ttl('counter')); // Should be 0 or -1 after expiration
}, 6000);