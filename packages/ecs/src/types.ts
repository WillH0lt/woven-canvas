import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer } from "./EventBuffer";
import { Pool } from "./Pool";
import type { Component } from "./Component";
import type { QueryInstance } from "./Query";
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
  // Registered components in the world, keyed by component name.
  components: Record<string, Component<any>>;
  // Maximum number of entities supported in the world.
  maxEntities: number;
  // Maximum number of events in the event ring buffer.
  maxEvents: number;
  // Total number of registered components in the world.
  componentCount: number;
  // Tick incremented each time execute is called.
  tick: number;
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
  /**
   * Unique identifier for the current reader context.
   * Used by QueryDef to create separate QueryInstance per consumer (system, subscriber, etc.).
   * Format: "world_{worldId}" for default, "world_{worldId}_system_{systemId}" for systems,
   * "world_{worldId}_subscriber_{subscriberId}" for subscribers.
   */
  readerId: string;
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

// Import system classes for type exports
import type {
  BaseSystemClass,
  MainThreadSystemClass,
  WorkerSystemClass,
} from "./System";

/**
 * Base system type (alias for BaseSystemClass)
 */
export type BaseSystem = BaseSystemClass;

/**
 * Main thread system type (alias for MainThreadSystemClass)
 */
export type MainThreadSystem = MainThreadSystemClass;

/**
 * Worker system type (alias for WorkerSystemClass)
 */
export type WorkerSystem = WorkerSystemClass;

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
