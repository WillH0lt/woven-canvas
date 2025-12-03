import { EntityBuffer } from "./EntityBuffer";
import type { Component } from "./Component";
import type { ComponentBuffer } from "./Component/types";
import type { QueryCache } from "./QueryCache";

/**
 * Context object passed to parallel system execution functions.
 * Contains the entity buffer view for querying and accessing entity data within workers.
 */
export interface Context {
  entityBuffer: EntityBuffer;
  components: Record<string, Component<any>>;
  queryCache: Map<string, QueryCache>;
  maxEntities: number;
}

/**
 * Interface representing the component masks for query matching
 */
export interface QueryMasks {
  tracking: number;
  with: number;
  without: number;
  any: number;
}

/**
 * Type alias for entity identifiers
 */
export type EntityId = number;

/**
 * System execution function signature
 */
export type SystemFunction = (ctx: Context) => void;

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
    bitmask: number;
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
  entityMetadataSAB: SharedArrayBuffer;
  componentData: ComponentTransferData;
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
