import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer } from "./EventBuffer";
import { Pool } from "./Pool";
import type { Component } from "./Component";
import type { ComponentBuffer } from "./Component/types";

/**
 * Context object for system execution.
 * Contains the entity buffer and components for querying and accessing entity data.
 * Works identically on main thread and worker threads.
 */
export interface Context {
  // Entity buffer containing all entities and their components.
  entityBuffer: EntityBuffer;
  // Event buffer for tracking entity and component changes.
  eventBuffer: EventBuffer;
  // Entity id pool for allocating and freeing entity IDs.
  pool: Pool;
  // Registered components in the world, keyed by component name.
  components: Record<string, Component<any>>;
  // Maximum number of entities supported in the world.
  maxEntities: number;
  // Total number of registered components in the world.
  componentCount: number;
  // Tick incremented each time execute is called.
  tick: number;
}

/**
 * Interface representing the component masks for query matching.
 * Each mask is a Uint8Array where each element represents 8 component bits.
 */
export interface QueryMasks {
  tracking: Uint8Array;
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
export type WorkerSystemFunction = (ctx: Context) => void;

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
  poolSAB: SharedArrayBuffer;
  poolBucketCount: number;
  poolSize: number;
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
