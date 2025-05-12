import { 
    INode, NodeAction, SharedState,
    AsyncNodeImpl,
    BatchNodeImpl, AsyncBatchNodeImpl, AsyncParallelBatchNodeImpl,
    BaseNodeImpl
} from './node';
import { PocketFlowLogger } from './logger';
import { NodeAction as NewNodeAction, SharedState as NewSharedState } from './types';

/**
 * Base class for flow orchestration.
 * Manages node transitions and execution flow.
 */
export abstract class BaseFlow<Shared extends SharedState> {
    protected currentNode: BaseNodeImpl<Shared, any, any> | null;
    protected logger: PocketFlowLogger;

    constructor(
        protected startNode: BaseNodeImpl<Shared, any, any>,
        protected sharedState: Shared
    ) {
        this.currentNode = null;
        this.logger = PocketFlowLogger.getInstance();
    }

    /**
     * Run the flow starting from the start node.
     * Handles node transitions based on returned actions.
     */
    async run(): Promise<void> {
        this.currentNode = this.startNode;
        this.logger.progress('Flow', 'Starting flow execution');

        while (this.currentNode) {
            try {
                // Run the current node
                const action = await this.currentNode.run(this.sharedState, true);

                // If no action returned, flow ends
                if (action === undefined) {
                    if (this.currentNode) {
                        this.logger.success('Flow', `Flow completed at node ${this.currentNode.constructor.name}`);
                    }
                    this.currentNode = null;
                    break;
                }

                // Get next node based on action
                const nextNode = this.currentNode.successors.get(action);
                if (!nextNode) {
                    if (this.currentNode) {
                        this.logger.error(
                            'Flow',
                            `No successor found for action: ${String(action)} at node ${this.currentNode.constructor.name}`
                        );
                    }
                    this.currentNode = null;
                    break;
                }

                if (this.currentNode) {
                    this.logger.info(
                        'Flow',
                        `Transitioning from ${this.currentNode.constructor.name} to ${nextNode.constructor.name} via action: ${String(action)}`
                    );
                }
                this.currentNode = nextNode as BaseNodeImpl<Shared, any, any>;
            } catch (error) {
                if (this.currentNode) {
                    this.logger.error(
                        'Flow',
                        `Error in flow execution at node ${this.currentNode.constructor.name}`,
                        error
                    );
                }
                throw error;
            }
        }
    }

    /**
     * Get the current node in the flow.
     */
    getCurrentNode(): BaseNodeImpl<Shared, any, any> | null {
        return this.currentNode;
    }

    /**
     * Reset the flow to its start node.
     */
    reset(): void {
        this.currentNode = this.startNode;
    }
}

/**
 * Flow implementation for async nodes.
 */
export abstract class AsyncFlow<Shared extends SharedState> extends BaseFlow<Shared> {
    constructor(startNode: AsyncNodeImpl<Shared, any, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

/**
 * Flow implementation for batch processing nodes.
 */
export abstract class BatchFlow<Shared extends SharedState, Item> extends BaseFlow<Shared> {
    constructor(startNode: BatchNodeImpl<Shared, any, Item, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

/**
 * Flow implementation for async batch processing nodes.
 */
export abstract class AsyncBatchFlow<Shared extends SharedState, Item> extends BaseFlow<Shared> {
    constructor(startNode: AsyncBatchNodeImpl<Shared, any, Item, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

/**
 * Flow implementation for parallel batch processing nodes.
 */
export abstract class AsyncParallelBatchFlow<Shared extends SharedState, Item> extends BaseFlow<Shared> {
    constructor(startNode: AsyncParallelBatchNodeImpl<Shared, any, Item, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

// Concrete implementations of BaseFlow
class ConcreteBaseFlow<Shared extends SharedState> extends BaseFlow<Shared> {
    constructor(startNode: BaseNodeImpl<Shared, any, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

class ConcreteAsyncFlow<Shared extends SharedState> extends AsyncFlow<Shared> {
    constructor(startNode: AsyncNodeImpl<Shared, any, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

class ConcreteBatchFlow<Shared extends SharedState> extends BatchFlow<Shared, any> {
    constructor(startNode: BatchNodeImpl<Shared, any, any, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

class ConcreteAsyncBatchFlow<Shared extends SharedState> extends AsyncBatchFlow<Shared, any> {
    constructor(startNode: AsyncBatchNodeImpl<Shared, any, any, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

class ConcreteAsyncParallelBatchFlow<Shared extends SharedState> extends AsyncParallelBatchFlow<Shared, any> {
    constructor(startNode: AsyncParallelBatchNodeImpl<Shared, any, any, any>, sharedState: Shared) {
        super(startNode, sharedState);
    }
}

/**
 * Builder class for creating flows with a fluent interface.
 */
export class FlowBuilder<Shared extends SharedState> {
    private startNode: BaseNodeImpl<Shared, any, any> | null = null;
    private sharedState: Shared | null = null;
    private logger: PocketFlowLogger;

    constructor() {
        this.logger = PocketFlowLogger.getInstance();
    }

    withStartNode(node: BaseNodeImpl<Shared, any, any>): FlowBuilder<Shared> {
        this.startNode = node;
        return this;
    }

    withSharedState(state: Shared): FlowBuilder<Shared> {
        this.sharedState = state;
        return this;
    }

    build(): BaseFlow<Shared> {
        if (!this.startNode || !this.sharedState) {
            throw new Error('Start node and shared state must be set before building flow');
        }

        return new ConcreteBaseFlow(this.startNode, this.sharedState);
    }

    buildAsync(): AsyncFlow<Shared> {
        if (!this.startNode || !this.sharedState) {
            throw new Error('Start node and shared state must be set before building flow');
        }
        if (!(this.startNode instanceof AsyncNodeImpl)) {
            throw new Error('Start node must be an AsyncNodeImpl for async flow');
        }

        return new ConcreteAsyncFlow(this.startNode, this.sharedState);
    }

    buildBatch(): BatchFlow<Shared, any> {
        if (!this.startNode || !this.sharedState) {
            throw new Error('Start node and shared state must be set before building flow');
        }
        if (!(this.startNode instanceof BatchNodeImpl)) {
            throw new Error('Start node must be a BatchNodeImpl for batch flow');
        }

        return new ConcreteBatchFlow(this.startNode, this.sharedState);
    }

    buildAsyncBatch(): AsyncBatchFlow<Shared, any> {
        if (!this.startNode || !this.sharedState) {
            throw new Error('Start node and shared state must be set before building flow');
        }
        if (!(this.startNode instanceof AsyncBatchNodeImpl)) {
            throw new Error('Start node must be an AsyncBatchNodeImpl for async batch flow');
        }

        return new ConcreteAsyncBatchFlow(this.startNode, this.sharedState);
    }

    buildAsyncParallelBatch(): AsyncParallelBatchFlow<Shared, any> {
        if (!this.startNode || !this.sharedState) {
            throw new Error('Start node and shared state must be set before building flow');
        }
        if (!(this.startNode instanceof AsyncParallelBatchNodeImpl)) {
            throw new Error('Start node must be an AsyncParallelBatchNodeImpl for parallel batch flow');
        }

        return new ConcreteAsyncParallelBatchFlow(this.startNode, this.sharedState);
    }
} 