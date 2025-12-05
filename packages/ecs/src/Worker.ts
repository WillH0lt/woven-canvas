import { EntityBuffer } from "./EntityBuffer";
import { EventBuffer } from "./EventBuffer";
import { Pool } from "./Pool";
import { Component } from "./Component";
import type {
  EntityId,
  Context,
  WorkerIncomingMessage,
  WorkerSuccessResponse,
  WorkerErrorResponse,
  ComponentTransferMap,
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
  ComponentTransferMap: ComponentTransferMap | null;
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
    ComponentTransferMap: null,
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
      internalContext.ComponentTransferMap = e.data.componentTransferMap;

      const eventBuffer = EventBuffer.fromTransfer(e.data.eventSAB);
      const pool = Pool.fromTransfer(
        e.data.poolSAB,
        e.data.poolBucketCount,
        e.data.poolSize
      );
      const entityBuffer = EntityBuffer.fromTransfer(
        e.data.entitySAB,
        e.data.componentCount
      );

      // Create Component instances from transfer data
      const components: Record<string, Component<any>> = {};
      for (const [name, transferData] of Object.entries(
        internalContext.ComponentTransferMap
      )) {
        const component = Component.fromTransferData(
          name,
          transferData,
          eventBuffer,
          entityBuffer
        );
        components[name] = component;
      }

      internalContext.context = {
        entityBuffer,
        eventBuffer,
        pool,
        components,
        queries: {},
        maxEntities: e.data.maxEntities,
        maxEvents: e.data.maxEvents,
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
 * Reset the internal worker state. Only used for testing.
 * @internal
 */
export function __resetWorkerState(): void {
  internalContext = null;
}
