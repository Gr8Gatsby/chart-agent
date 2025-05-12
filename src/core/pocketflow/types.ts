/**
 * Base interface for all nodes in the flow.
 */
export interface INode<Shared extends SharedState, P extends NodeParams, R extends NodeAction | void> {
    params: P;
    successors: Map<NodeAction, INode<Shared, any, any>>;
    setParams(params: P): void;
    next(node: INode<Shared, any, any>, action?: NodeAction): INode<Shared, any, any>;
    prep(shared: Shared): Promise<any> | any;
    exec(prepResult: any): Promise<R> | R;
    post(shared: Shared, prepResult: any, execResult: R): Promise<R | void> | R | void;
    run(shared: Shared): Promise<R | void>;
}

/**
 * Interface for async nodes.
 */
export interface IAsyncNode<Shared extends SharedState, P extends NodeParams, R extends NodeAction | void>
    extends INode<Shared, P, R> {
    prep(shared: Shared): Promise<any>;
    exec(prepResult: any): Promise<R>;
    post(shared: Shared, prepResult: any, execResult: R): Promise<R | void>;
    run(shared: Shared): Promise<R | void>;
}

/**
 * Type for node parameters.
 */
export type NodeParams = Record<string, any>;

/**
 * Type for shared state between nodes.
 */
export type SharedState = Record<string, any>;

/**
 * Type for node actions that determine flow transitions.
 */
export type NodeAction = string | symbol;

/**
 * Default action for node transitions.
 */
export const DEFAULT_ACTION: NodeAction = Symbol('DEFAULT_ACTION');

// Interface for Flow control
export interface IFlow<Shared extends SharedState, P extends NodeParams, R extends NodeAction | void> extends INode<Shared, P, R> {
    startNode?: INode<Shared, any, any>;
    withStartNode(node: INode<Shared, any, any>): IFlow<Shared, P, R>;
    withSharedState(state: Shared): IFlow<Shared, P, R>;
    getNextNode(currentNode: INode<Shared, any, any>, action: R | NodeAction | void): INode<Shared, any, any> | undefined;
} 