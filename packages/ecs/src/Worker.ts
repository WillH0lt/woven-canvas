import { EntityBuffer } from "./EntityBuffer";
import type { Component } from "./Component";
import type {
  WorkerContext,
  WorkerIncomingMessage,
  WorkerSuccessResponse,
  WorkerErrorResponse,
} from "./types";

/**
 * Composable API for parallel systems that run in web workers.
 *
 * @example
 * // In your worker file (e.g., myWorker.ts):
 * import { defineSystem } from '@infinitecanvas/ecs';
 * import { Position, Velocity } from './components';
 *
 * defineSystem(self, (ctx) => {
 *   // Your parallel computation here
 *   console.log('Running in worker!');
 *   console.log('Entity buffer available:', ctx.entityBuffer);
 * }, { Position, Velocity });
 */

interface InternalContext {
  context: WorkerContext | null;
  execute: (ctx: WorkerContext) => void | Promise<void>;
}

let internalContext: InternalContext | null = null;

/**
 * Register a parallel system to run in a web worker.
 * Call this function in your worker file to set up the execution handler and initialize components.
 *
 * @param self - The worker's global scope (pass `self`)
 * @param execute - Function to execute when the worker receives a task. Receives a WorkerContext object with entityBuffer.
 * @param components - Record of component instances to initialize in the worker (e.g., { Position, Velocity })
 *
 * @example
 * import { Position, Velocity } from './components';
 *
 * defineSystem(self, (ctx) => {
 *   // Your system logic here using the context
 *   console.log('Entity buffer:', ctx.entityBuffer);
 * }, { Position, Velocity });
 */
export function setupWorker(
  execute: (ctx: WorkerContext) => void | Promise<void>,
  components: Record<string, Component<any>>
): void {
  // Store component instances for initialization
  (self as any).__componentInstances = components;

  // Initialize internal context
  internalContext = {
    context: null,
    execute,
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
      // Initialize entity buffer if provided
      const components: Record<string, Component<any>> = {};
      const workerComponents = (self as any).__componentInstances || {};

      // Initialize component instances in worker with transferred buffers
      for (const [name, comp] of Object.entries(e.data.componentData)) {
        const componentInstance = workerComponents[name];

        componentInstance.initializeFromTransfer(comp.bitmask, comp.buffer);
        components[name] = componentInstance;
      }

      internalContext.context = {
        entityBuffer: EntityBuffer.fromTransfer(
          e.data.entitySAB,
          e.data.entityMetadataSAB
        ),
        components,
        maxEntities: e.data.maxEntities,
        isWorker: true,
      };
      sendResult(self, index);
    } else if (type === "execute") {
      // Execute the system
      if (!internalContext.context) {
        throw new Error("Entity buffer not initialized");
      }
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
