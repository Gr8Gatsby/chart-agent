import { DEFAULT_ACTION } from './types';
export * from './types';
// Helper for async delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/**
 * Base implementation for all nodes.
 */
export class BaseNodeImpl {
    constructor() {
        this.params = {};
        this.successors = new Map();
    }
    setParams(params) {
        // Use structuredClone for a deep copy if necessary, but often shallow is fine
        this.params = { ...params };
    }
    next(node, action = DEFAULT_ACTION) {
        if (this.successors.has(action)) {
            console.warn(`[PocketFlow] Overwriting successor for action: ${String(action)} on node ${this.constructor.name}`);
        }
        this.successors.set(action, node);
        return node;
    }
    // Basic lifecycle methods - subclasses should override
    prep(shared) {
        // Default implementation does nothing
        return undefined;
    }
    post(shared, prepResult, execResult) {
        // Default implementation returns the execution result (action)
        return execResult;
    }
    /** Internal execution logic, potentially overridden by subclasses (like NodeImpl for retries) */
    _exec(prepResult) {
        return this.exec(prepResult);
    }
    /** Internal run sequence */
    async _run(shared) {
        const prepResult = await this.prep(shared);
        // Ensure _exec result is awaited correctly, even if potentially synchronous
        const execResult = await Promise.resolve(this._exec(prepResult));
        // execResult might be void if exec doesn't return an action directly
        if (execResult !== undefined) {
            // Ensure post result is awaited correctly
            return await Promise.resolve(this.post(shared, prepResult, execResult));
        }
        // Still call post even if execResult is void
        await Promise.resolve(this.post(shared, prepResult, execResult));
        return undefined;
    }
    /** Public run method */
    async run(shared) {
        if (this.successors.size > 0) {
            console.warn(`[PocketFlow] Node ${this.constructor.name} called directly with successors defined. Use a Flow class to handle transitions.`);
        }
        return await this._run(shared);
    }
}
/**
 * Node implementation with retry logic.
 */
export class NodeImpl extends BaseNodeImpl {
    constructor(maxRetries = 1, waitMs = 0) {
        super();
        this.currentRetry = 0; // Track retries for the main exec call
        this.maxRetries = Math.max(1, maxRetries); // Ensure at least 1 try
        this.waitMs = waitMs;
    }
    /** Fallback logic if all retries fail */
    execFallback(prepResult, error) {
        throw error; // Default: re-throw the error
    }
    // This _exec implements the retry logic around the main exec method
    async _exec(prepResult) {
        for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
            try {
                // Await even if exec is synchronous to handle potential Promises
                return await Promise.resolve(this.exec(prepResult));
            }
            catch (error) {
                console.warn(`[PocketFlow] Node ${this.constructor.name} main exec failed on attempt ${this.currentRetry + 1}/${this.maxRetries}. Error:`, error);
                if (this.currentRetry === this.maxRetries - 1) {
                    console.error(`[PocketFlow] Node ${this.constructor.name} main exec exhausted all retries.`);
                    // Await fallback result
                    return await Promise.resolve(this.execFallback(prepResult, error));
                }
                if (this.waitMs > 0) {
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
export class AsyncNodeImpl extends NodeImpl {
    // Ensure run returns a Promise
    async run(shared) {
        if (this.successors.size > 0) {
            console.warn(`[PocketFlow] AsyncNode ${this.constructor.name} called directly with successors defined. Use an AsyncFlow class.`);
        }
        // Call the base class _run, which is already async
        return await super._run(shared);
    }
}
/**
 * Base class for nodes processing batches sequentially.
 * Expects prepResult to be an array of Items.
 */
export class BatchNodeImpl extends NodeImpl // Batch execution result is usually just void or a single action
 {
    // Optional fallback for a single item
    execItemFallback(item, error) {
        throw error; // Default: re-throw
    }
    // Override base exec - this now orchestrates the batch using _execItemWithRetry
    async exec(prepResult) {
        if (!Array.isArray(prepResult)) {
            throw new Error(`[PocketFlow] Input to BatchNode ${this.constructor.name} exec is not an array.`);
        }
        const items = prepResult;
        const results = [];
        for (const item of items) {
            try {
                // Call helper that includes retry logic for the single item
                const result = await this._execItemWithRetry(item);
                results.push(result);
                // TODO: Decide how to aggregate/handle actions returned by individual items.
            }
            catch (error) { // NOSONAR
                console.error(`[PocketFlow] Error processing item in BatchNode ${this.constructor.name}, halting batch. Item:`, item, error);
                // If needed, call the main batch fallback here, passing the aggregated error or context
                // await Promise.resolve(this.execFallback(items, error as Error));
                throw error; // Re-throw to halt the batch by default
            }
        }
        // Batch nodes typically return void or a fixed action after processing all items
        return;
    }
    // Fallback for the entire batch operation (e.g., if prep failed)
    execFallback(prepResult, error) {
        console.error(`[PocketFlow] BatchNode ${this.constructor.name} fallback triggered. PrepResult:`, prepResult);
        throw error; // Default batch fallback
    }
    // Helper to run execItem with the node's retry logic (implemented directly here)
    async _execItemWithRetry(item) {
        let itemRetry = 0;
        for (itemRetry = 0; itemRetry < this.maxRetries; itemRetry++) {
            try {
                return await Promise.resolve(this.execItem(item));
            }
            catch (error) {
                console.warn(`[PocketFlow] BatchNode ${this.constructor.name} execItem failed for item on attempt ${itemRetry + 1}/${this.maxRetries}. Error:`, error);
                if (itemRetry === this.maxRetries - 1) {
                    console.error(`[PocketFlow] BatchNode ${this.constructor.name} execItem exhausted all retries for item.`);
                    return await Promise.resolve(this.execItemFallback(item, error));
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
export class AsyncBatchNodeImpl extends AsyncNodeImpl // Batch result is void or single action
 {
    // Override base exec to orchestrate async batch
    async exec(prepResult) {
        if (!Array.isArray(prepResult)) {
            throw new Error(`[PocketFlow] Input to AsyncBatchNode ${this.constructor.name} exec is not an array.`);
        }
        const items = prepResult;
        const results = [];
        for (const item of items) {
            try {
                // Call async helper that includes retry logic for the single item
                const result = await this._execItemWithRetry(item);
                results.push(result);
            }
            catch (error) { // NOSONAR
                console.error(`[PocketFlow] Error processing item in AsyncBatchNode ${this.constructor.name}, halting batch. Item:`, item, error);
                throw error; // Always re-throw to halt the batch and reject the promise
            }
        }
        return;
    }
    // Fallback for the entire async batch operation
    async execFallback(prepResult, error) {
        console.error(`[PocketFlow] AsyncBatchNode ${this.constructor.name} fallback triggered. PrepResult:`, prepResult);
        throw error;
    }
    // Helper to run async execItem with the node's retry logic
    async _execItemWithRetry(item) {
        let itemRetry = 0;
        for (itemRetry = 0; itemRetry < this.maxRetries; itemRetry++) {
            try {
                // No Promise.resolve needed here as execItem is already async
                return await this.execItem(item);
            }
            catch (error) {
                console.warn(`[PocketFlow] AsyncBatchNode ${this.constructor.name} execItem failed on attempt ${itemRetry + 1}/${this.maxRetries}. Error:`, error);
                if (itemRetry === this.maxRetries - 1) {
                    console.error(`[PocketFlow] AsyncBatchNode ${this.constructor.name} execItem exhausted all retries.`);
                    await this.execItemFallback(item, error);
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
export class AsyncParallelBatchNodeImpl extends AsyncBatchNodeImpl {
    // Override exec for parallel execution
    async exec(prepResult) {
        if (!Array.isArray(prepResult)) {
            throw new Error(`[PocketFlow] Input to AsyncParallelBatchNode ${this.constructor.name} exec is not an array.`);
        }
        const items = prepResult;
        // Map each item to its execution-with-retry promise
        const promises = items.map(item => this._execItemWithRetry(item));
        try {
            const results = await Promise.all(promises);
            // Process results if needed
        }
        catch (error) {
            console.error(`[PocketFlow] Error during parallel batch execution in ${this.constructor.name}:`, error);
            throw error; // Re-throw the first error encountered by Promise.all
        }
        return; // Batch returns void/fixed action
    }
}
//# sourceMappingURL=node.js.map