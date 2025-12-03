import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer } from "./EventBuffer";
import type { Component } from "./Component";
import type { ComponentBuffer } from "./Component/types";
import type { QueryCache } from "./QueryCache";

/**
 * Base context properties shared between main thread and worker contexts.
 */
export interface BaseContext {
  entityBuffer: EntityBuffer;
  eventBuffer: EventBuffer;
  components: Record<string, Component<any>>;
  maxEntities: number;
  componentCount: number;
}

/**
 * Context object for main thread system execution.
 * Contains the entity buffer and components for querying and accessing entity data.
 */
export interface Context extends BaseContext {
  isWorker: false;
  queries: Map<string, QueryCache>;
}

/**
 * Context object for worker thread system execution.
 * Contains the entity buffer view for querying and accessing entity data within workers.
 */
export interface WorkerContext extends BaseContext {
  isWorker: true;
}

/**
 * Union type for any context (main thread or worker).
 */
export type AnyContext = Context | WorkerContext;

/**
 * Interface representing the component masks for query matching.
 * Each mask is a Uint8Array where each element represents 8 component bits.
 */
export interface QueryMasks {
  tracking: number;
  with: Uint8Array;
  without: Uint8Array;
  any: Uint8Array;
}

/**
 * Type alias for entity identifiers
 */
export type EntityId = number;

/**
 * System execution function signature for main thread systems
 */
export type SystemFunction = (ctx: Context) => void;

/**
 * System execution function signature for worker systems
 */
export type WorkerSystemFunction = (ctx: WorkerContext) => void;

/**
 * Base system interface
 */
export interface BaseSystem {
  readonly type: "main" | "worker";
}

/**
 * Main thread system
 */
export interface MainThreadSystem extends BaseSystem {
  readonly type: "main";
  readonly execute: SystemFunction;
}

/**
 * Worker system
 */
export interface WorkerSystem extends BaseSystem {
  readonly type: "worker";
  readonly path: string;
}

/**
 * Union type for all system types
 */
export type System = MainThreadSystem | WorkerSystem;

export type ComponentTransferData = {
  [name: string]: {
    name: string;
    componentId: number;
    buffer: ComponentBuffer<any>;
  };
};

/**
 * Message sent from main thread to initialize the worker
 */
export interface InitMessage {
  type: "init";
  index: number;
  entitySAB: SharedArrayBuffer;
  eventSAB: SharedArrayBuffer;
  componentData: ComponentTransferData;
  maxEntities: number;
  componentCount: number;
}

/**
 * Message sent from main thread to execute the system
 */
export interface ExecuteMessage {
  type: "execute";
  index: number;
}

/**
 * Union type of all messages that can be received by the worker
 */
export type WorkerIncomingMessage = InitMessage | ExecuteMessage;

/**
 * Success response from worker to main thread
 */
export interface WorkerSuccessResponse {
  index: number;
  result: true;
}

/**
 * Error response from worker to main thread
 */
export interface WorkerErrorResponse {
  index: number;
  error: string;
}

/**
 * Union type of all messages that can be sent from the worker
 */
export type WorkerOutgoingMessage = WorkerSuccessResponse | WorkerErrorResponse;
