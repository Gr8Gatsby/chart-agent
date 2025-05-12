import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { 
    BaseNodeImpl, NodeImpl, AsyncNodeImpl,
    BatchNodeImpl, AsyncBatchNodeImpl, AsyncParallelBatchNodeImpl
} from '../node';
import { NodeAction, SharedState, NodeParams } from '../types';

let originalWarn: any, originalError: any;
beforeAll(() => {
  originalWarn = console.warn;
  originalError = console.error;
  console.warn = () => {};
  console.error = () => {};
});
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

describe('Node Implementations', () => {
    // Test shared state type
    interface TestSharedState extends SharedState {
        counter: number;
        data: string[];
    }

    // Test node params type
    interface TestNodeParams extends NodeParams {
        value: number;
        name: string;
    }

    // Test action type
    type TestAction = 'next' | 'error' | 'complete';

    describe('BaseNodeImpl', () => {
        class TestNode extends BaseNodeImpl<TestSharedState, TestNodeParams, TestAction> {
            exec(prepResult: any): TestAction {
                return 'next';
            }
        }

        let node: TestNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            node = new TestNode();
            sharedState = { counter: 0, data: [] };
        });

        it('should set params correctly', () => {
            const params: TestNodeParams = { value: 42, name: 'test' };
            node.setParams(params);
            expect(node.params).toEqual(params);
        });

        it('should handle node transitions', () => {
            const nextNode = new TestNode();
            const result = node.next(nextNode, 'next');
            expect(result).toBe(nextNode);
            expect(node.successors.get('next')).toBe(nextNode);
        });

        it('should warn on overwriting successors', () => {
            const consoleSpy = vi.spyOn(console, 'warn');
            const nextNode1 = new TestNode();
            const nextNode2 = new TestNode();
            
            node.next(nextNode1, 'next');
            node.next(nextNode2, 'next');
            
            expect(consoleSpy).toHaveBeenCalled();
            expect(node.successors.get('next')).toBe(nextNode2);
        });
    });

    describe('NodeImpl with Retry', () => {
        class RetryNode extends NodeImpl<TestSharedState, TestNodeParams, TestAction> {
            private shouldFail = true;

            exec(prepResult: any): TestAction {
                if (this.shouldFail) {
                    this.shouldFail = false;
                    throw new Error('Simulated failure');
                }
                return 'next';
            }

            execFallback(prepResult: any, error: Error): TestAction {
                return 'error';
            }
        }

        let node: RetryNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            node = new RetryNode(2, 100); // 2 retries, 100ms delay
            sharedState = { counter: 0, data: [] };
        });

        it('should retry on failure and succeed', async () => {
            const result = await node.run(sharedState);
            expect(result).toBe('next');
        });

        it('should use fallback after max retries', async () => {
            const alwaysFailNode = new class extends RetryNode {
                exec(prepResult: any): TestAction {
                    throw new Error('Always fails');
                }
            }(1, 100);

            const result = await alwaysFailNode.run(sharedState);
            expect(result).toBe('error');
        });
    });

    describe('AsyncNodeImpl', () => {
        class AsyncTestNode extends AsyncNodeImpl<TestSharedState, TestNodeParams, TestAction> {
            async prep(shared: TestSharedState): Promise<any> {
                shared.counter++;
                return shared.counter;
            }

            async exec(prepResult: any): Promise<TestAction> {
                return 'next';
            }

            async post(shared: TestSharedState, prepResult: any, execResult: TestAction): Promise<TestAction> {
                shared.data.push('post');
                return execResult;
            }

            async execFallback(prepResult: any, error: Error): Promise<TestAction> {
                return 'error';
            }
        }

        let node: AsyncTestNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            node = new AsyncTestNode();
            sharedState = { counter: 0, data: [] };
        });

        it('should execute async lifecycle methods', async () => {
            const result = await node.run(sharedState);
            expect(result).toBe('next');
            expect(sharedState.counter).toBe(1);
            expect(sharedState.data).toContain('post');
        });
    });

    describe('BatchNodeImpl', () => {
        class BatchTestNode extends BatchNodeImpl<TestSharedState, TestNodeParams, number, TestAction> {
            execItem(item: number): TestAction {
                if (item < 0) throw new Error('Negative number');
                return 'next';
            }
        }

        let node: BatchTestNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            node = new BatchTestNode();
            sharedState = { counter: 0, data: [] };
        });

        it('should process batch items sequentially', async () => {
            const items = [1, 2, 3];
            const result = await node.exec(items);
            expect(result).toBeUndefined();
        });

        it('should handle batch item failures', async () => {
            const items = [1, -2, 3];
            await expect(node.exec(items)).rejects.toThrow('Negative number');
        });
    });

    describe('AsyncBatchNodeImpl', () => {
        class AsyncBatchTestNode extends AsyncBatchNodeImpl<TestSharedState, TestNodeParams, number, TestAction> {
            async prep(shared: TestSharedState): Promise<any> {
                return shared.data;
            }

            async execItem(item: number): Promise<TestAction> {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (item < 0) throw new Error('Negative number');
                return 'next';
            }

            async post(shared: TestSharedState, prepResult: any, execResult: TestAction): Promise<TestAction> {
                return execResult;
            }

            async execItemFallback(item: number, error: Error): Promise<TestAction> {
                return 'error';
            }
        }

        let node: AsyncBatchTestNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            node = new AsyncBatchTestNode();
            sharedState = { counter: 0, data: [] };
        });

        it('should process batch items asynchronously', async () => {
            const items = [1, 2, 3];
            const result = await node.exec(items);
            expect(result).toBeUndefined();
        });

        it('should handle async batch item failures', async () => {
            const items = [1, -2, 3];
            await expect(node.exec(items)).rejects.toThrow('Negative number');
        });
    });

    describe('AsyncParallelBatchNodeImpl', () => {
        class ParallelBatchTestNode extends AsyncParallelBatchNodeImpl<TestSharedState, TestNodeParams, number, TestAction> {
            async prep(shared: TestSharedState): Promise<any> {
                return shared.data;
            }

            async execItem(item: number): Promise<TestAction> {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (item < 0) throw new Error('Negative number');
                return 'next';
            }

            async post(shared: TestSharedState, prepResult: any, execResult: TestAction): Promise<TestAction> {
                return execResult;
            }

            async execItemFallback(item: number, error: Error): Promise<TestAction> {
                return 'error';
            }
        }

        let node: ParallelBatchTestNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            node = new ParallelBatchTestNode();
            sharedState = { counter: 0, data: [] };
        });

        it('should process batch items in parallel', async () => {
            const items = [1, 2, 3];
            const startTime = Date.now();
            const result = await node.exec(items);
            const duration = Date.now() - startTime;
            
            expect(result).toBeUndefined();
            // Should take less than 40ms (3 items * 10ms) if truly parallel
            expect(duration).toBeLessThan(40);
        });

        it('should handle parallel batch item failures', async () => {
            const items = [1, -2, 3];
            await expect(node.exec(items)).rejects.toThrow('Negative number');
        });
    });
}); 