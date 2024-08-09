import { HeapNode } from "../../../types/OctopusTypes";

/**
 * A priority queue implemented using a binary heap.
 * 
 * This class manages tasks with associated priorities, allowing the task with 
 * the highest priority (lowest priority number) to be dequeued first. 
 * It uses a min-heap to efficiently maintain the priority order.
 * A binary heap is well-suited for a priority queue because it allows both 
 * insertion and extraction of the highest or lowest priority element in O(log n) time, 
 * which is more efficient than repeatedly sorting an array.
 * 
 * @template T The type of the tasks managed by the queue.
 */
export class BinaryHeapPriorityQueue<T> {
    private heap: HeapNode<T>[] = [];

    /**
     * Compares two heap nodes to determine their order.
     * 
     * @param a The first node to compare.
     * @param b The second node to compare.
     * @returns True if the first node has a higher priority (lower priority number).
     */
    private compare(a: HeapNode<T>, b: HeapNode<T>): boolean {
        return a.priority < b.priority; // Min-heap: lower priority values have higher precedence
    }

    /**
     * Swaps two elements in the heap array.
     * 
     * @param i The index of the first element.
     * @param j The index of the second element.
     */
    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    /**
     * Calculates the index of the parent of a given node.
     * 
     * @param index The index of the node.
     * @returns The index of the parent node.
     */
    private parent(index: number): number {
        return Math.floor((index - 1) / 2);
    }

    /**
     * Calculates the index of the left child of a given node.
     * 
     * @param index The index of the node.
     * @returns The index of the left child node.
     */
    private leftChild(index: number): number {
        return 2 * index + 1;
    }

    /**
     * Calculates the index of the right child of a given node.
     * 
     * @param index The index of the node.
     * @returns The index of the right child node.
     */
    private rightChild(index: number): number {
        return 2 * index + 2;
    }

    /**
     * Restores the heap property by moving a node up the heap.
     * 
     * This method is called after a new element is added to the heap.
     * 
     * @param index The index of the node to move up.
     */
    private heapifyUp(index: number): void {
        let currentIndex = index;
        while (currentIndex > 0) {
            const parentIndex = this.parent(currentIndex);
            if (this.compare(this.heap[currentIndex], this.heap[parentIndex])) {
                this.swap(currentIndex, parentIndex);
                currentIndex = parentIndex;
            } else {
                break;
            }
        }
    }

    /**
     * Restores the heap property by moving a node down the heap.
     * 
     * This method is called after the root element is removed from the heap.
     * 
     * @param index The index of the node to move down.
     */
    private heapifyDown(index: number): void {
        let currentIndex = index;
        const length = this.heap.length;

        while (true) {
            const left = this.leftChild(currentIndex);
            const right = this.rightChild(currentIndex);
            let smallest = currentIndex;

            if (left < length && this.compare(this.heap[left], this.heap[smallest])) {
                smallest = left;
            }

            if (right < length && this.compare(this.heap[right], this.heap[smallest])) {
                smallest = right;
            }

            if (smallest !== currentIndex) {
                this.swap(currentIndex, smallest);
                currentIndex = smallest;
            } else {
                break;
            }
        }
    }

    /**
     * Adds a task with a given priority to the priority queue.
     * 
     * The task will be positioned in the heap according to its priority.
     * 
     * @param task The task to add to the queue.
     * @param priority The priority of the task. Lower values indicate higher priority.
     */
    public enqueue(task: T, priority: number): void {
        const newNode: HeapNode<T> = { task, priority };
        this.heap.push(newNode);
        this.heapifyUp(this.heap.length - 1);
    }

    /**
     * Removes and returns the task with the highest priority from the queue.
     * 
     * The task with the lowest priority number will be removed first.
     * 
     * @returns The task with the highest priority, or `undefined` if the queue is empty.
     */
    public dequeue(): T | undefined {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop()?.task;

        const root = this.heap[0];
        this.heap[0] = this.heap.pop()!;
        this.heapifyDown(0);

        return root.task;
    }

    /**
     * Returns the task with the highest priority without removing it from the queue.
     * 
     * @returns The task with the highest priority, or `undefined` if the queue is empty.
     */
    public peek(): T | undefined {
        return this.heap.length > 0 ? this.heap[0].task : undefined;
    }

    /**
     * Returns the number of tasks currently in the queue.
     * 
     * @returns The number of tasks in the queue.
     */
    public size(): number {
        return this.heap.length;
    }
}
