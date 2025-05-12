import { 
    INode, IAsyncNode, NodeParams, SharedState, NodeAction, DEFAULT_ACTION 
} from './types';
import { PocketFlowLogger } from './logger';
import { sleep } from './utils';

export * from './types';

/**
 * Base implementation for all nodes.
 */
export abstract class BaseNodeImpl<Shared extends SharedState, P extends NodeParams, R extends NodeAction | void>
    implements INode<Shared, P, R>
{
    public params: P = {} as P;
    public successors: Map<NodeAction, INode<Shared, any, any>> = new Map();
    protected logger: PocketFlowLogger;

    constructor() {
        this.logger = PocketFlowLogger.getInstance();
    }

    setParams(params: P): void {
        // Use structuredClone for a deep copy if necessary, but often shallow is fine
        this.params = { ...params }; 
    }

    next(node: INode<Shared, any, any>, action: NodeAction = DEFAULT_ACTION): INode<Shared, any, any> {
        if (this.successors.has(action)) {
            this.logger.warn(
                this.constructor.name,
                `Overwriting successor for action: ${String(action)}`
            );
        }
        this.successors.set(action, node);
        return node; 
    }

    // Basic lifecycle methods - subclasses should override
    prep(shared: Shared): Promise<any> | any {
        // Default implementation does nothing
        return undefined; 
    }

    abstract exec(prepResult: any): Promise<R> | R;

    post(shared: Shared, prepResult: any, execResult: R): Promise<R | void> | R | void {
        // Default implementation returns the execution result (action)
        return execResult; 
    }

    /** Internal execution logic, potentially overridden by subclasses (like NodeImpl for retries) */
    protected _exec(prepResult: any): Promise<R> | R {
        return this.exec(prepResult);
    }

    /** Internal run sequence */
    protected async _run(shared: Shared): Promise<R | void> {
        try {
            this.logger.progress(this.constructor.name, 'Preparing node execution');
            const prepResult = await this.prep(shared);
            this.logger.progress(this.constructor.name, 'Executing node');
            const execResult = await this._exec(prepResult);
            this.logger.progress(this.constructor.name, 'Finalizing node execution');
            const result = await this.post(shared, prepResult, execResult);
            this.logger.success(this.constructor.name, 'Node execution completed');
            return result;
        } catch (error: any) {
            const errorContext = {
                nodeName: this.constructor.name,
                errorName: error?.name || 'UnknownError',
                errorMessage: error?.message || 'No error message available',
                errorStack: error?.stack || 'No stack trace available',
                params: this.params,
                sharedState: shared
            };
            
            this.logger.error(
                this.constructor.name,
                'Error in node execution',
                {
                    error: errorContext,
                    phase: 'execution',
                    params: this.params
                }
            );
            
            // Log additional error details if available
            if (error?.cause) {
                this.logger.error(
                    this.constructor.name,
                    'Error cause',
                    error.cause
                );
            }
            
            throw error;
        }
    }

    /** Public run method */
    async run(shared: Shared, fromFlow: boolean = false): Promise<R | void> {
        if (this.successors.size > 0 && !fromFlow) {
            this.logger.warn(
                this.constructor.name,
                'AsyncNode called directly with successors defined. Use an AsyncFlow class.'
            );
        }
        return await this._run(shared);
    }
}

/**
 * Node implementation with retry logic.
 */
export abstract class NodeImpl<Shared extends SharedState, P extends NodeParams, R extends NodeAction | void>
    extends BaseNodeImpl<Shared, P, R> 
{
    protected maxRetries: number;
    protected waitMs: number;
    protected currentRetry: number = 0; // Track retries for the main exec call

    constructor(maxRetries: number = 1, waitMs: number = 0) {
        super();
        this.maxRetries = Math.max(1, maxRetries); // Ensure at least 1 try
        this.waitMs = waitMs;
    }

    /** Fallback logic if all retries fail */
    execFallback(prepResult: any, error: Error): Promise<R> | R {
        throw error; // Default: re-throw the error
    }

    // This _exec implements the retry logic around the main exec method
    protected async _exec(prepResult: any): Promise<R> {
        for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
            try {
                // Await even if exec is synchronous to handle potential Promises
                return await Promise.resolve(this.exec(prepResult));
            } catch (error) {
                this.logger.warn(
                    this.constructor.name,
                    `Main exec failed on attempt ${this.currentRetry + 1}/${this.maxRetries}`,
                    error
                );
                if (this.currentRetry === this.maxRetries - 1) {
                    this.logger.error(
                        this.constructor.name,
                        'Exhausted all retries, executing fallback'
                    );
                    // Await fallback result
                    return await Promise.resolve(this.execFallback(prepResult, error as Error));
                }
                if (this.waitMs > 0) {
                    this.logger.info(
                        this.constructor.name,
                        `Waiting ${this.waitMs}ms before retry`
                    );
                    await sleep(this.waitMs);
                }
            }
        }
        // This should technically be unreachable due to the fallback or successful return
        throw new Error('PocketFlow: _exec finished loop unexpectedly.');
    }
}

/**
 * Async-native node implementation.
 */
export abstract class AsyncNodeImpl<Shared extends SharedState, P extends NodeParams, R extends NodeAction | void>
    extends NodeImpl<Shared, P, R> implements IAsyncNode<Shared, P, R>
{
    // Ensure lifecycle methods return Promises
    abstract prep(shared: Shared): Promise<any>;
    abstract exec(prepResult: any): Promise<R>;
    // Post must also return a Promise to match IAsyncNode
    abstract post(shared: Shared, prepResult: any, execResult: R): Promise<R | void>; 
    abstract execFallback(prepResult: any, error: Error): Promise<R>; // Fallback must also be async

    // Ensure run returns a Promise
    async run(shared: Shared, fromFlow: boolean = false): Promise<R | void> {
        if (this.successors.size > 0 && !fromFlow) {
            this.logger.warn(
                this.constructor.name,
                'AsyncNode called directly with successors defined. Use an AsyncFlow class.'
            );
        }
        // Call the base class _run, which is already async
        return await super._run(shared); 
    }

    protected async _run(shared: Shared): Promise<R | void> {
        try {
            this.logger.progress(this.constructor.name, 'Preparing async node execution');
            const prepResult = await this.prep(shared);
            this.logger.progress(this.constructor.name, 'Executing async node');
            const execResult = await this._exec(prepResult);
            this.logger.progress(this.constructor.name, 'Finalizing async node execution');
            const result = await this.post(shared, prepResult, execResult);
            this.logger.success(this.constructor.name, 'Async node execution completed');
            return result;
        } catch (error: any) {
            const errorContext = {
                nodeName: this.constructor.name,
                errorName: error?.name || 'UnknownError',
                errorMessage: error?.message || 'No error message available',
                errorStack: error?.stack || 'No stack trace available',
                params: this.params,
                sharedState: shared
            };
            
            this.logger.error(
                this.constructor.name,
                'Error in async node execution',
                {
                    error: errorContext,
                    phase: 'execution',
                    params: this.params
                }
            );
            
            // Log additional error details if available
            if (error?.cause) {
                this.logger.error(
                    this.constructor.name,
                    'Error cause',
                    error.cause
                );
            }
            
            throw error;
        }
    }
}

/**
 * Base class for nodes processing batches sequentially.
 * Expects prepResult to be an array of Items.
 */
export abstract class BatchNodeImpl<Shared extends SharedState, P extends NodeParams, Item, RItem extends NodeAction | void>
    extends NodeImpl<Shared, P, NodeAction | void> // Batch execution result is usually just void or a single action
{
    // execItem processes a single item
    abstract execItem(item: Item): Promise<RItem> | RItem;
    // Optional fallback for a single item
    execItemFallback(item: Item, error: Error): Promise<RItem> | RItem {
         throw error; // Default: re-throw
    }

    // Override base exec - this now orchestrates the batch using _execItemWithRetry
    async exec(prepResult: any): Promise<NodeAction | void> {
        if (!Array.isArray(prepResult)) {
            throw new Error(`[PocketFlow] Input to BatchNode ${this.constructor.name} exec is not an array.`);
        }
        const items: Item[] = prepResult;
        const results: RItem[] = [];

        for (const item of items) {
            try {
                // Call helper that includes retry logic for the single item
                const result = await this._execItemWithRetry(item);
                results.push(result);
                // TODO: Decide how to aggregate/handle actions returned by individual items.
            } catch (error) { // NOSONAR
                this.logger.error(
                    this.constructor.name,
                    'Error processing item in batch',
                    { item, error }
                );
                throw error; // Re-throw to halt the batch by default
            }
        }
        // Batch nodes typically return void or a fixed action after processing all items
        return;
    }
    
    // Fallback for the entire batch operation (e.g., if prep failed)
    execFallback(prepResult: any, error: Error): Promise<NodeAction | void> {
        this.logger.error(
            this.constructor.name,
            'Batch fallback triggered',
            { prepResult, error }
        );
        throw error; // Default batch fallback
    }

    // Helper to run execItem with the node's retry logic (implemented directly here)
    protected async _execItemWithRetry(item: Item): Promise<RItem> {
        let itemRetry = 0;
        for (itemRetry = 0; itemRetry < this.maxRetries; itemRetry++) {
             try {
                return await Promise.resolve(this.execItem(item));
            } catch (error) {
                this.logger.warn(
                    this.constructor.name,
                    `ExecItem failed for item on attempt ${itemRetry + 1}/${this.maxRetries}`,
                    { item, error }
                );
                if (itemRetry === this.maxRetries - 1) {
                    this.logger.error(
                        this.constructor.name,
                        'ExecItem exhausted all retries for item',
                        { item }
                    );
                    return await Promise.resolve(this.execItemFallback(item, error as Error));
                }
                if (this.waitMs > 0) {
                    await sleep(this.waitMs);
                }
            }
        }
         throw new Error('PocketFlow: _execItemWithRetry finished loop unexpectedly.');
    }
}

/**
 * Async version of BatchNodeImpl.
 */
export abstract class AsyncBatchNodeImpl<Shared extends SharedState, P extends NodeParams, Item, RItem extends NodeAction | void>
    extends AsyncNodeImpl<Shared, P, NodeAction | void> // Batch result is void or single action
{
    // Ensure item execution is async
    abstract execItem(item: Item): Promise<RItem>;
    // Ensure item fallback is async
    abstract execItemFallback(item: Item, error: Error): Promise<RItem>;

    // Override base exec to orchestrate async batch
    async exec(prepResult: any): Promise<NodeAction | void> {
        if (!Array.isArray(prepResult)) {
            throw new Error(`[PocketFlow] Input to AsyncBatchNode ${this.constructor.name} exec is not an array.`);
        }
        const items: Item[] = prepResult;
        const results: RItem[] = [];

        for (const item of items) {
            try {
                // Call async helper that includes retry logic for the single item
                const result = await this._execItemWithRetry(item);
                results.push(result);
            } catch (error) { // NOSONAR
                this.logger.error(
                    this.constructor.name,
                    'Error processing item in async batch',
                    { item, error }
                );
                throw error; // Always re-throw to halt the batch and reject the promise
            }
        }
        return;
    }
    
    // Fallback for the entire async batch operation
    async execFallback(prepResult: any, error: Error): Promise<NodeAction | void> {
        this.logger.error(
            this.constructor.name,
            'Async batch fallback triggered',
            { prepResult, error }
        );
        throw error;
    }

     // Helper to run async execItem with the node's retry logic
    protected async _execItemWithRetry(item: Item): Promise<RItem> {
        let itemRetry = 0;
        for (itemRetry = 0; itemRetry < this.maxRetries; itemRetry++) {
            try {
                // No Promise.resolve needed here as execItem is already async
                return await this.execItem(item);
            } catch (error) {
                this.logger.warn(
                    this.constructor.name,
                    `ExecItem failed on attempt ${itemRetry + 1}/${this.maxRetries}`,
                    { item, error }
                );
                if (itemRetry === this.maxRetries - 1) {
                    this.logger.error(
                        this.constructor.name,
                        'ExecItem exhausted all retries',
                        { item }
                    );
                    await this.execItemFallback(item, error as Error);
                    throw error; // Always throw after fallback
                }
                if (this.waitMs > 0) {
                    await sleep(this.waitMs);
                }
            }
        }
        throw new Error('PocketFlow: _execItemWithRetry finished loop unexpectedly.');
    }
}

/**
 * Async node processing batches in parallel.
 */
export abstract class AsyncParallelBatchNodeImpl<Shared extends SharedState, P extends NodeParams, Item, RItem extends NodeAction | void>
    extends AsyncBatchNodeImpl<Shared, P, Item, RItem>
{
    // Override exec for parallel execution
    async exec(prepResult: any): Promise<NodeAction | void> {
        if (!Array.isArray(prepResult)) {
            throw new Error(`[PocketFlow] Input to AsyncParallelBatchNode ${this.constructor.name} exec is not an array.`);
        }
        const items: Item[] = prepResult;
       
        // Map each item to its execution-with-retry promise
        const promises = items.map(item => this._execItemWithRetry(item));

        try {
            const results = await Promise.all(promises);
            // Process results if needed
        } catch(error) {
            this.logger.error(
                this.constructor.name,
                'Error during parallel batch execution',
                error
            );
            throw error; // Re-throw the first error encountered by Promise.all
        }

        return; // Batch returns void/fixed action
    }
} 