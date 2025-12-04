import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer } from "./EventBuffer";
import { Pool } from "./Pool";
import type { Component } from "./Component";
import type {
  EntityId,
  Context,
  WorkerIncomingMessage,
  WorkerSuccessResponse,
  WorkerErrorResponse,
  ComponentTransferData,
} from "./types";

/**
 * Composable API for parallel systems that run in web workers.
 *
 * @example
 * // In your worker file (e.g., myWorker.ts):
 * import { setupWorker, query, type Context } from '@infinitecanvas/ecs';
 * import { Position, Velocity } from './components';
 *
 * setupWorker(execute);
 *
 * function execute(ctx: Context) {
 *   for (const eid of query(ctx, (q) => q.with(Position, Velocity))) {
 *     const pos = Position.read(eid);
 *     console.log(`Entity ${eid} Position: (${pos.x}, ${pos.y})`);
 *   }
 * }
 */

interface InternalContext {
  context: Context | null;
  execute: (ctx: Context) => void | Promise<void>;
  componentTransferData: ComponentTransferData | null;
}

let internalContext: InternalContext | null = null;

/**
 * Register a parallel system to run in a web worker.
 * Call this function in your worker file to set up the execution handler.
 * Components are automatically initialized when first accessed via queries.
 *
 * @param execute - Function to execute when the worker receives a task. Receives a Context object with entityBuffer.
 *
 * @example
 * import { setupWorker, query, type Context } from '@infinitecanvas/ecs';
 * import { Position, Velocity } from './components';
 *
 * setupWorker(execute);
 *
 * function execute(ctx: Context) {
 *   for (const eid of query(ctx, (q) => q.with(Position, Velocity))) {
 *     const pos = Position.read(eid);
 *     console.log(`Entity ${eid} Position: (${pos.x}, ${pos.y})`);
 *   }
 * }
 */
export function setupWorker(
  execute: (ctx: Context) => void | Promise<void>
): void {
  // Initialize internal context
  internalContext = {
    context: null,
    execute,
    componentTransferData: null,
  };

  // Set up message handler for communication with main thread
  self.onmessage = async (e: MessageEvent<WorkerIncomingMessage>) => {
    handleMessage(e, self);
  };
}

/**
 * Handle incoming messages from the main thread
 */
function handleMessage(
  e: MessageEvent<WorkerIncomingMessage>,
  self: any
): void {
  const { type, index } = e.data;

  if (!internalContext) {
    sendError(
      self,
      index,
      "Worker not initialized. Call defineSystem(...) first."
    );

    return;
  }

  try {
    if (type === "init") {
      // Store component transfer data for lazy initialization
      internalContext.componentTransferData = e.data.componentData;

      const eventBuffer = EventBuffer.fromTransfer(e.data.eventSAB);
      const pool = Pool.fromTransfer(
        e.data.poolSAB,
        e.data.poolBucketCount,
        e.data.poolSize
      );

      internalContext.context = {
        entityBuffer: EntityBuffer.fromTransfer(
          e.data.entitySAB,
          e.data.componentCount
        ),
        eventBuffer,
        pool,
        components: {},
        maxEntities: e.data.maxEntities,
        componentCount: e.data.componentCount,
        tick: 0,
      };

      sendResult(self, index);
    } else if (type === "execute") {
      // Execute the system
      if (!internalContext.context) {
        throw new Error("Entity buffer not initialized");
      }
      // Increment frame number so queries know to update their caches
      internalContext.context.tick++;
      internalContext.execute(internalContext.context);
      sendResult(self, index);
    }
  } catch (error: any) {
    sendError(self, index, error.message);
  }
}

/**
 * Send a successful result back to the main thread
 */
function sendResult(self: any, index: number): void {
  const message: WorkerSuccessResponse = { index, result: true };
  self.postMessage(message);
}

/**
 * Send an error back to the main thread
 */
function sendError(self: any, index: number, error: string): void {
  const message: WorkerErrorResponse = { index, error };
  self.postMessage(message);
}

/**
 * Initialize a component in the worker context from transferred data.
 * This is called lazily when a component is first accessed via a query.
 * @internal
 */
export function initializeComponentInWorker(
  component: Component<any>
): boolean {
  if (!internalContext?.componentTransferData || !internalContext.context) {
    return false;
  }

  const transferData = internalContext.componentTransferData[component.name];
  if (!transferData) {
    console.warn(
      `Component "${component.name}" not found in transfer data. ` +
        `Make sure it's registered with the World on the main thread.`
    );
    return false;
  }

  // Initialize the component with the transferred data and event buffer
  component.fromTransfer(
    transferData.componentId,
    transferData.buffer,
    internalContext.context.eventBuffer
  );
  return true;
}

/**
 * Reset the internal worker state. Only used for testing.
 * @internal
 */
export function __resetWorkerState(): void {
  internalContext = null;
}

/**
 * Create a new entity in a worker thread.
 * Uses atomic operations to safely allocate an entity ID across threads.
 *
 * @param ctx - The context
 * @returns The newly created entity ID
 * @throws Error if the entity pool is exhausted
 *
 * @example
 * import { setupWorker, createEntity, type Context } from '@infinitecanvas/ecs';
 * import { Position } from './components';
 *
 * setupWorker(execute);
 *
 * function execute(ctx: Context) {
 *   const entityId = createEntity(ctx);
 *   Position.write(entityId, { x: 0, y: 0 });
 * }
 */
export function createEntity(ctx: Context): EntityId {
  const entityId = ctx.pool.get();

  ctx.entityBuffer.create(entityId);
  ctx.eventBuffer.pushAdded(entityId);

  return entityId;
}

/**
 * Remove an entity in a worker thread.
 * Uses atomic operations to safely free the entity ID.
 *
 * @param ctx - The context
 * @param entityId - The entity ID to remove
 *
 * @example
 * import { setupWorker, removeEntity, type Context } from '@infinitecanvas/ecs';
 *
 * setupWorker(execute);
 *
 * function execute(ctx: Context) {
 *   removeEntity(ctx, someEntityId);
 * }
 */
export function removeEntity(ctx: Context, entityId: EntityId): void {
  ctx.eventBuffer.pushRemoved(entityId);
  ctx.entityBuffer.delete(entityId);
  ctx.pool.free(entityId);
}
