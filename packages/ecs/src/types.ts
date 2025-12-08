import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer } from "./EventBuffer";
import { Pool } from "./Pool";
import { CommandBuffer } from "./CommandBuffer";
import type { Component } from "./Component";
import type { Query } from "./Query";
import type { ComponentBuffer, FieldDef } from "./Component/types";

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
  // Command buffer for deferred operations (main thread only, undefined in workers).
  commandBuffer?: CommandBuffer;
  // Registered components in the world, keyed by component name.
  components: Record<string, Component<any>>;
  // Registered queries in the world, keyed by query name.
  queries: Record<string, Query>;
  // Maximum number of entities supported in the world.
  maxEntities: number;
  // Maximum number of events in the event ring buffer.
  maxEvents: number;
  // Total number of registered components in the world.
  componentCount: number;
  // Tick incremented each time execute is called.
  tick: number;
  /**
   * Whether this context is from the main World (true) or a worker (false/undefined).
   * When true, entity/component operations are deferred to the command buffer.
   * When false/undefined, operations execute immediately.
   */
  worldContext?: boolean;
  /**
   * Whether we are currently inside system execution or command buffer flushing.
   * When true with worldContext, operations execute immediately.
   * When false with worldContext, operations are deferred.
   */
  isExecuting?: boolean;
  /**
   * Index of the current worker thread (0-based).
   * On the main thread, this is always 0.
   * In workers, this identifies which partition of work this thread handles.
   */
  threadIndex: number;
  /**
   * Total number of worker threads for the current system.
   * On the main thread, this is always 1.
   * In workers, queries automatically partition results based on threadIndex/threadCount.
   */
  threadCount: number;
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

  hasTracking: boolean;
  hasWith: boolean;
  hasWithout: boolean;
  hasAny: boolean;
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
  /**
   * Event buffer index from the previous execution.
   * Used for deferred entity ID reclamation.
   */
  prevEventIndex: number;
  /**
   * Event buffer index at the start of the current execution.
   * Updated before each execution, then moved to prevEventIndex after.
   */
  currEventIndex: number;
}

/**
 * Main thread system
 */
export interface MainThreadSystem extends BaseSystem {
  readonly type: "main";
  readonly execute: SystemFunction;
}

/**
 * Priority levels for worker system execution
 */
export type WorkerPriority = "low" | "normal" | "high";

/**
 * Options for configuring worker system behavior
 */
export interface WorkerSystemOptions {
  /**
   * Number of worker threads to spawn for this system.
   * Each thread runs the same worker code in parallel.
   * @default 1
   */
  threads?: number;
  /**
   * Priority level for worker scheduling.
   * Higher priority workers are started first when multiple worker systems run together.
   * - 'high': Started first (priority value: 2)
   * - 'normal': Default priority (priority value: 1)
   * - 'low': Started last (priority value: 0)
   * @default 'normal'
   */
  priority?: WorkerPriority;
}

/**
 * Worker system
 */
export interface WorkerSystem extends BaseSystem {
  readonly type: "worker";
  readonly path: string;
  readonly threads: number;
  readonly priority: WorkerPriority;
}

/**
 * Union type for all system types
 */
export type System = MainThreadSystem | WorkerSystem;

export type ComponentTransferData = {
  name: string;
  componentId: number;
  buffer: ComponentBuffer<any>;
  schema: Record<string, FieldDef>;
  isSingleton: boolean;
};

export type ComponentTransferMap = Record<string, ComponentTransferData>;

/**
 * Message sent from main thread to initialize the worker
 */
export interface InitMessage {
  type: "init";
  entitySAB: SharedArrayBuffer;
  eventSAB: SharedArrayBuffer;
  poolSAB: SharedArrayBuffer;
  poolBucketCount: number;
  poolSize: number;
  componentTransferMap: ComponentTransferMap;
  maxEntities: number;
  maxEvents: number;
  componentCount: number;
  threadIndex: number;
  threadCount: number;
}

/**
 * Message sent from main thread to execute the system
 */
export interface ExecuteMessage {
  type: "execute";
  threadIndex: number;
}

/**
 * Union type of all messages that can be received by the worker
 */
export type WorkerIncomingMessage = InitMessage | ExecuteMessage;

/**
 * Success response from worker to main thread
 */
export interface WorkerSuccessResponse {
  threadIndex: number;
  result: true;
}

/**
 * Error response from worker to main thread
 */
export interface WorkerErrorResponse {
  threadIndex: number;
  error: string;
}

/**
 * Union type of all messages that can be sent from the worker
 */
export type WorkerOutgoingMessage = WorkerSuccessResponse | WorkerErrorResponse;
