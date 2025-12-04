import type {
  ComponentTransferData,
  Context,
  WorkerSystem,
  InitMessage,
  ExecuteMessage,
  WorkerOutgoingMessage,
} from "./types";

/**
 * WorkerManager - manages a pool of web workers for parallel execution
 */
export class WorkerManager {
  private maxWorkers: number;
  private workerPool: Map<string, Worker[]> = new Map();
  private initializedWorkers: Set<Worker> = new Set();
  private taskQueue: Array<() => void> = [];
  private activeWorkers = 0;

  /**
   * Create a new WorkerManager instance
   * @param maxWorkers - Maximum number of workers to use (defaults to hardware concurrency)
   */
  constructor(maxWorkers: number) {
    this.maxWorkers = maxWorkers;
  }

  /**
   * Execute a system in parallel using web workers
   * @param workerPath - Path to the worker file
   * @param batches - Number of parallel batches to run (default: 4)
   * @param entityBuffer - Optional entity buffer to pass to workers
   * @param components - Components registry to pass to workers
   * @param data - Optional data to pass to each worker
   * @returns Promise that resolves when all batches complete
   */
  async execute(workerSystem: WorkerSystem, ctx: Context): Promise<void> {
    const promises = [];
    const batches = 1;

    // Execute tasks (workers will be initialized on-demand)
    for (let i = 0; i < batches; i++) {
      promises.push(this.executeTask(ctx, workerSystem.path, i));
    }

    await Promise.all(promises);
  }

  /**
   * Initialize a worker with the entity buffer
   * @param worker - The worker to initialize
   * @param index - Index of this worker
   * @param entityBuffer - Optional entity buffer to pass
   * @returns Promise that resolves when initialization is complete
   */
  private async initializeWorker(
    ctx: Context,
    worker: Worker,
    index: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${index} initialization timed out`));
      }, 5000); // 5 second timeout

      const messageHandler = (e: MessageEvent<WorkerOutgoingMessage>) => {
        if (e.data.index === index) {
          clearTimeout(timeout);
          worker.removeEventListener("message", messageHandler);

          if ("error" in e.data) {
            reject(new Error(e.data.error));
          } else {
            resolve();
          }
        }
      };

      worker.addEventListener("message", messageHandler);

      // Serialize component metadata and buffers for reconstruction in worker
      const componentData: ComponentTransferData = {};
      for (const [name, component] of Object.entries(ctx.components)) {
        componentData[name] = {
          name,
          componentId: component.componentId,
          buffer: component.buffer, // Transfer the SharedArrayBuffer-backed typed arrays
        };
      }

      // Send initialization message with shared buffers
      const initMessage: InitMessage = {
        type: "init",
        index,
        entitySAB: ctx.entityBuffer.getBuffer() as SharedArrayBuffer,
        eventSAB: ctx.eventBuffer.getBuffer() as SharedArrayBuffer,
        poolSAB: ctx.pool.getBuffer(),
        poolBucketCount: ctx.pool.getBucketCount(),
        poolSize: ctx.pool.getSize(),
        componentData,
        maxEntities: ctx.maxEntities,
        maxEvents: ctx.maxEvents,
        componentCount: ctx.componentCount,
      };
      worker.postMessage(initMessage);
    });
  }

  /**
   * Execute a single task on a worker
   * @param workerPath - Path to the worker file
   * @param index - Index of this task
   * @param data - Optional data to pass to the worker
   * @returns Promise that resolves with the task result
   */
  private async executeTask(
    ctx: Context,
    workerPath: string,
    index: number
  ): Promise<any> {
    const worker = await this.getWorker(workerPath);

    // Initialize worker if not already initialized
    if (!this.initializedWorkers.has(worker)) {
      await this.initializeWorker(ctx, worker, index);
      this.initializedWorkers.add(worker);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        this.removeWorker(workerPath, worker);
        reject(new Error(`Task ${index} timed out`));
      }, 30000); // 30 second timeout

      worker.onmessage = (e: MessageEvent<WorkerOutgoingMessage>) => {
        clearTimeout(timeout);

        if ("error" in e.data) {
          reject(new Error(e.data.error));
        } else {
          resolve(true);
        }

        this.releaseWorker(workerPath, worker);
      };

      worker.onerror = (error: ErrorEvent) => {
        clearTimeout(timeout);
        reject(error);
        this.releaseWorker(workerPath, worker);
      };

      // Send the task to the worker
      const executeMessage: ExecuteMessage = {
        type: "execute",
        index,
      };
      worker.postMessage(executeMessage);
    });
  }

  /**
   * Get a worker from the pool or create a new one
   * @param workerPath - Path to the worker file
   * @returns Promise that resolves with a worker
   */
  private async getWorker(workerPath: string): Promise<Worker> {
    // Get or create pool for this worker path
    let pool = this.workerPool.get(workerPath);
    if (!pool) {
      pool = [];
      this.workerPool.set(workerPath, pool);
    }

    // If we have idle workers for this path, reuse them
    if (pool.length > 0) {
      return pool.pop()!;
    }

    // If we're at max capacity, wait
    if (this.activeWorkers >= this.maxWorkers) {
      return new Promise<Worker>((resolve) => {
        this.taskQueue.push(() => resolve);
      });
    }

    // Create a new worker
    this.activeWorkers++;
    return this.createWorker(workerPath);
  }

  /**
   * Create a new web worker from a file path
   * @param workerPath - Path to the worker file
   * @returns A new Worker instance
   */
  private createWorker(workerPath: string): Worker {
    return new Worker(workerPath, { type: "module" });
  }

  /**
   * Release a worker back to the pool or assign it to a queued task
   * @param workerPath - Path to the worker file
   * @param worker - The worker to release
   */
  private releaseWorker(workerPath: string, worker: Worker): void {
    // If there are queued tasks, assign this worker to them
    if (this.taskQueue.length > 0) {
      const resolveFactory = this.taskQueue.shift();
      if (resolveFactory) {
        resolveFactory();
      }
    } else {
      // Return worker to pool
      const pool = this.workerPool.get(workerPath);
      if (pool) {
        pool.push(worker);
      }
    }
  }

  /**
   * Remove a worker from the pool and decrement active worker count
   * @param workerPath - Path to the worker file
   * @param worker - The worker to remove
   */
  private removeWorker(workerPath: string, worker: Worker): void {
    this.activeWorkers--;
    const pool = this.workerPool.get(workerPath);
    if (pool) {
      const index = pool.indexOf(worker);
      if (index > -1) {
        pool.splice(index, 1);
      }
    }
  }

  /**
   * Dispose of the worker manager and terminate all workers
   */
  dispose(): void {
    // Terminate all workers in all pools
    for (const pool of this.workerPool.values()) {
      for (const worker of pool) {
        worker.terminate();
      }
    }
    this.workerPool.clear();
    this.initializedWorkers.clear();
    this.activeWorkers = 0;
    this.taskQueue = [];
  }
}
