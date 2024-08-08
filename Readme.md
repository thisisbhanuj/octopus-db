# OCTOPUS DB

## STORY
Redis is single-threaded. It uses a single thread to handle all client requests, which means it processes one command at a time. This design simplifies the system, avoids the complexity of multi-threading, and leverages the speed of in-memory data operations.

However, Redis can still achieve high throughput because it can handle a large number of requests per second due to its efficient event loop and non-blocking I/O operations. Additionally, Redis 6 introduced I/O threads to improve performance for networking, which allows for some parallelism in handling I/O operations, but the core data structure operations remain single-threaded.

I decided to write my own custom implementation of REDIS in multi-threaded manner