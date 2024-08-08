import Octopus from '../core/multi-threaded/octopus';

describe('Octopus Singleton', () => {
    it('should return the same instance for multiple getInstance calls', () => {
        const instance1 = Octopus.getInstance();
        const instance2 = Octopus.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should initialize with default number of workers if maxWorkers is not provided', () => {
        const instance = Octopus.getInstance();
        expect(instance).toBeDefined();
        // Assuming you have a way to get the number of workers, like a getter or inspection method
        expect(instance.getWorkerCount()).toBe(8);
    });

    it('should initialize with specified number of workers if maxWorkers is provided', () => {
        const instance = Octopus.getInstance(10);
        expect(instance).toBeDefined();
        expect(instance.getWorkerCount()).toBe(10);
    });
});

describe('Octopus Key-Value Operations', () => {
    let octopus: Octopus;

    beforeEach(() => {
        octopus = Octopus.getInstance();
    });

    it('should set a key-value pair successfully', async () => {
        const result = await octopus.set('key1', 'value1');
        expect(result).toBe('OK');
    });

    it('should retrieve the value for an existing key', async () => {
        await octopus.set('key2', 'value2');
        const value = await octopus.get('key2');
        expect(value).toBe('value2');
    });

    it('should return null for a non-existing key', async () => {
        const value = await octopus.get('nonExistingKey');
        expect(value).toBeNull();
    });

    it('should delete an existing key', async () => {
        await octopus.set('key3', 'value3');
        const result = await octopus.del('key3');
        expect(result).toBe(1);
    });

    it('should return 0 when deleting a non-existing key', async () => {
        const result = await octopus.del('nonExistingKey');
        expect(result).toBe(0);
    });

    it('should check existence of a key', async () => {
        await octopus.set('key4', 'value4');
        const exists = await octopus.exists('key4');
        expect(exists).toBe(1);
    });

    it('should return 0 if key does not exist when checking existence', async () => {
        const exists = await octopus.exists('nonExistingKey');
        expect(exists).toBe(0);
    });

    it('should increment a key value', async () => {
        await octopus.set('key5', '5');
        const newValue = await octopus.incr('key5');
        expect(newValue).toBe('6');
    });

    it('should decrement a key value', async () => {
        await octopus.set('key6', '10');
        const newValue = await octopus.decr('key6');
        expect(newValue).toBe('9');
    });

    it('should set and retrieve TTL', async () => {
        await octopus.set('key7', 'value7');
        const result = await octopus.expire('key7', 60);
        expect(result).toBe(1);

        const ttl = await octopus.ttl('key7');
        expect(ttl).toBeGreaterThanOrEqual(0);
    });

    it('should return -1 if TTL does not exist', async () => {
        const ttl = await octopus.ttl('nonExistingKey');
        expect(ttl).toBe(-1);
    });
});


describe('Octopus Error Handling', () => {
    let octopus: Octopus;

    beforeEach(() => {
        octopus = Octopus.getInstance();
    });

    it('should handle worker errors gracefully', async () => {
        // Simulate worker error scenario
        
        // In some cases, you might need to cast your instance to any to bypass TypeScript’s type checking 
        // for methods that are not directly recognized as mockable. 
        // This is a workaround to handle TypeScript’s strict type checking
        jest.spyOn(octopus as any, 'runWorker').mockImplementation(() => {
            return Promise.reject(new Error('Worker Error'));
        });

        await expect(octopus.set('key', 'value')).rejects.toThrow('Worker Error');
    });

    it('should handle worker crashes gracefully', async () => {
        // Simulate worker crash scenario
        jest.spyOn(octopus as any, 'runWorker').mockImplementation(() => {
            return Promise.reject(new Error('Worker Crashed'));
        });

        await expect(octopus.get('key')).rejects.toThrow('Worker Crashed');
    });
});
