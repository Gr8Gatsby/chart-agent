import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { 
    BaseFlow, AsyncFlow, BatchFlow, AsyncBatchFlow, AsyncParallelBatchFlow,
    FlowBuilder
} from '../flow';
import { 
    BaseNodeImpl, AsyncNodeImpl,
    BatchNodeImpl, AsyncBatchNodeImpl, AsyncParallelBatchNodeImpl
} from '../node';
import { NodeAction, SharedState, NodeParams } from '../types';

let originalWarn: any, originalError: any, originalLog: any;

beforeAll(() => {
  originalWarn = console.warn;
  originalError = console.error;
  originalLog = console.log;
  console.warn = () => {};
  console.error = () => {};
  console.log = () => {};
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
  console.log = originalLog;
});

describe('Flow Implementations', () => {
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

    describe('BaseFlow', () => {
        class TestNode extends BaseNodeImpl<TestSharedState, TestNodeParams, TestAction> {
            exec(prepResult: any): TestAction {
                return 'next';
            }
        }

        class TestFlow extends BaseFlow<TestSharedState> {
            constructor(startNode: TestNode, sharedState: TestSharedState) {
                super(startNode, sharedState);
            }
        }

        let flow: TestFlow;
        let startNode: TestNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            startNode = new TestNode();
            sharedState = { counter: 0, data: [] };
            flow = new TestFlow(startNode, sharedState);
        });

        it('should run a simple flow', async () => {
            const nextNode = new TestNode();
            startNode.next(nextNode, 'next');
            await flow.run();
            expect(flow.getCurrentNode()).toBeNull();
        });

        it('should handle flow completion', async () => {
            const completeNode = new class extends TestNode {
                exec(): TestAction {
                    return 'complete';
                }
            }();
            startNode.next(completeNode, 'next');
            await flow.run();
            expect(flow.getCurrentNode()).toBeNull();
        });

        it('should handle flow errors', async () => {
            const errorNode = new class extends TestNode {
                exec(): TestAction {
                    throw new Error('Flow error');
                }
            }();
            startNode.next(errorNode, 'next');
            await expect(flow.run()).rejects.toThrow('Flow error');
        });

        it('should reset flow state', async () => {
            const nextNode = new TestNode();
            startNode.next(nextNode, 'next');
            await flow.run();
            flow.reset();
            expect(flow.getCurrentNode()).toBe(startNode);
        });
    });

    describe('AsyncFlow', () => {
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

        class TestAsyncFlow extends AsyncFlow<TestSharedState> {
            constructor(startNode: AsyncTestNode, sharedState: TestSharedState) {
                super(startNode, sharedState);
            }
        }

        let flow: TestAsyncFlow;
        let startNode: AsyncTestNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            startNode = new AsyncTestNode();
            sharedState = { counter: 0, data: [] };
            flow = new TestAsyncFlow(startNode, sharedState);
        });

        it('should run an async flow', async () => {
            const nextNode = new AsyncTestNode();
            startNode.next(nextNode, 'next');
            await flow.run();
            expect(sharedState.counter).toBe(2); // Both nodes increment counter
            expect(sharedState.data).toHaveLength(2); // Both nodes add to data
        });
    });

    describe('BatchFlow', () => {
        class BatchTestNode extends BatchNodeImpl<TestSharedState, TestNodeParams, number, TestAction> {
            execItem(item: number): TestAction {
                if (item < 0) throw new Error('Negative number');
                return 'next';
            }
        }

        class TestBatchFlow extends BatchFlow<TestSharedState, number> {
            constructor(startNode: BatchTestNode, sharedState: TestSharedState) {
                super(startNode, sharedState);
            }
        }

        let flow: TestBatchFlow;
        let startNode: BatchTestNode;
        let sharedState: TestSharedState;

        beforeEach(() => {
            startNode = new BatchTestNode();
            sharedState = { counter: 0, data: [] };
            flow = new TestBatchFlow(startNode, sharedState);
        });

        it('should process batch items', async () => {
            const items = [1, 2, 3];
            await startNode.exec(items);
            expect(sharedState.data).toHaveLength(0); // No errors
        });
    });

    describe('FlowBuilder', () => {
        let builder: FlowBuilder<TestSharedState>;
        let sharedState: TestSharedState;

        beforeEach(() => {
            sharedState = { counter: 0, data: [] };
            builder = new FlowBuilder<TestSharedState>();
        });

        it('should build a base flow', () => {
            const node = new class extends BaseNodeImpl<TestSharedState, TestNodeParams, TestAction> {
                exec(): TestAction {
                    return 'next';
                }
            }();

            const flow = builder.withStartNode(node).withSharedState(sharedState).build();
            expect(flow).toBeInstanceOf(BaseFlow);
        });

        it('should build an async flow', () => {
            const node = new class extends AsyncNodeImpl<TestSharedState, TestNodeParams, TestAction> {
                async prep(): Promise<any> { return null; }
                async exec(): Promise<TestAction> { return 'next'; }
                async post(): Promise<TestAction> { return 'next'; }
                async execFallback(): Promise<TestAction> { return 'error'; }
            }();

            const flow = builder.withStartNode(node).withSharedState(sharedState).buildAsync();
            expect(flow).toBeInstanceOf(AsyncFlow);
        });

        it('should build a batch flow', () => {
            const node = new class extends BatchNodeImpl<TestSharedState, TestNodeParams, number, TestAction> {
                execItem(): TestAction { return 'next'; }
            }();

            const flow = builder.withStartNode(node).withSharedState(sharedState).buildBatch();
            expect(flow).toBeInstanceOf(BatchFlow);
        });

        it('should build an async batch flow', () => {
            const node = new class extends AsyncBatchNodeImpl<TestSharedState, TestNodeParams, number, TestAction> {
                async prep(): Promise<any> { return null; }
                async execItem(): Promise<TestAction> { return 'next'; }
                async post(): Promise<TestAction> { return 'next'; }
                async execItemFallback(): Promise<TestAction> { return 'error'; }
            }();

            const flow = builder.withStartNode(node).withSharedState(sharedState).buildAsyncBatch();
            expect(flow).toBeInstanceOf(AsyncBatchFlow);
        });

        it('should build a parallel batch flow', () => {
            const node = new class extends AsyncParallelBatchNodeImpl<TestSharedState, TestNodeParams, number, TestAction> {
                async prep(): Promise<any> { return null; }
                async execItem(): Promise<TestAction> { return 'next'; }
                async post(): Promise<TestAction> { return 'next'; }
                async execItemFallback(): Promise<TestAction> { return 'error'; }
            }();

            const flow = builder.withStartNode(node).withSharedState(sharedState).buildAsyncParallelBatch();
            expect(flow).toBeInstanceOf(AsyncParallelBatchFlow);
        });

        it('should throw if no start node is set', () => {
            expect(() => builder.build()).toThrow('Start node and shared state must be set before building flow');
        });
    });
}); 