import Octopus from '../core/multi-threaded/octopus';

jest.mock('../core/multi-threaded/worker/workerPoolWithState', () => {
    return {
        WorkerPool: jest.fn().mockImplementation(() => {
            return {
                runWorker: jest.fn()
            };
        })
    };
});

describe('Octopus Singleton', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return the same instance for multiple getInstance calls', () => {
        const instance1 = Octopus.getInstance();
        const instance2 = Octopus.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should initialize with default number of workers if maxWorkers is not provided', () => {
        const instance = Octopus.getInstance();
        expect(instance).toBeDefined();
        expect(instance.getWorkerCount()).toBe(8);
    });
});

describe('Octopus with mocked WorkerPool', () => {
    let octopus: Octopus;
    let mockRunWorker: jest.Mock;

    beforeEach(() => {
        octopus = Octopus.getInstance();
        mockRunWorker = (octopus as any).workerPool.runWorker as jest.Mock;
    });

    afterEach(() => {
        jest.clearAllMocks(); // Clear mock call history between tests
    });

    it('should set a key-value pair successfully', async () => {
        mockRunWorker.mockResolvedValue('OK');
        
        const result = await octopus.set('key1', 'value1');
        expect(result).toBe('OK');
        expect(mockRunWorker).toHaveBeenCalledWith({ type: 'set', key: 'key1', value: 'value1' });
    });

    it('should retrieve the value for an existing key', async () => {
        mockRunWorker.mockResolvedValue('value2');
        
        const value = await octopus.get('key2');
        expect(value).toBe('value2');
        expect(mockRunWorker).toHaveBeenCalledWith({ type: 'get', key: 'key2' });
    });

    it('should delete an existing key', async () => {
        mockRunWorker.mockResolvedValue(1);
        
        const result = await octopus.del('key3');
        expect(result).toBe(1);
        expect(mockRunWorker).toHaveBeenCalledWith({ type: 'del', key: 'key3' });
    });

    it('should handle worker errors gracefully', async () => {
        mockRunWorker.mockRejectedValue(new Error('Worker Error'));

        await expect(octopus.set('key', 'value')).rejects.toThrow('Worker Error');
        expect(mockRunWorker).toHaveBeenCalledWith({ type: 'set', key: 'key', value: 'value' });
    });
});

describe('Octopus Error Handling', () => {
    let octopus: Octopus;
    let mockRunWorker: jest.Mock;

    beforeEach(() => {
        octopus = Octopus.getInstance();
        mockRunWorker = (octopus as any).workerPool.runWorker as jest.Mock;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle worker errors gracefully', async () => {
        // Simulate worker error scenario by making the mock reject with an error
        mockRunWorker.mockRejectedValue(new Error('Worker Error'));

        await expect(octopus.set('key', 'value')).rejects.toThrow('Worker Error');
        expect(mockRunWorker).toHaveBeenCalledWith({ type: 'set', key: 'key', value: 'value' });
    });

    it('should handle worker crashes gracefully', async () => {
        // Simulate worker crash scenario by making the mock reject with a different error
        mockRunWorker.mockRejectedValue(new Error('Worker Crashed'));

        await expect(octopus.get('key')).rejects.toThrow('Worker Crashed');
        expect(mockRunWorker).toHaveBeenCalledWith({ type: 'get', key: 'key' });
    });
});
