/**
 * WorkerManager - manages a pool of web workers for parallel execution
 */
export class WorkerManager {
  private maxWorkers: number;
  private workerPool: Map<string, Worker[]> = new Map();
  private taskQueue: Array<() => void> = [];
  private activeWorkers = 0;

  /**
   * Create a new WorkerManager instance
   * @param maxWorkers - Maximum number of workers to use (defaults to hardware concurrency)
   */
  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers ?? navigator.hardwareConcurrency ?? 4;
  }

  /**
   * Execute a system in parallel using web workers
   * @param workerPath - Path to the worker file
   * @param batches - Number of parallel batches to run (default: 4)
   * @param data - Optional data to pass to each worker
   * @returns Promise that resolves when all batches complete
   */
  async executeInParallel(
    workerPath: string,
    batches: number = 4,
    data?: any
  ): Promise<void> {
    const promises = [];

    for (let i = 0; i < batches; i++) {
      promises.push(this.executeTask(workerPath, i, data, []));
    }

    await Promise.all(promises);
  }

  /**
   * Execute a single task on a worker
   * @param workerPath - Path to the worker file
   * @param index - Index of this task
   * @param data - Optional data to pass to the worker
   * @param results - Array to store results
   * @returns Promise that resolves with the task result
   */
  private async executeTask(
    workerPath: string,
    index: number,
    data: any,
    results: any[]
  ): Promise<any> {
    const worker = await this.getWorker(workerPath);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        this.removeWorker(workerPath, worker);
        reject(new Error(`Task ${index} timed out`));
      }, 30000); // 30 second timeout

      worker.onmessage = (e: MessageEvent) => {
        clearTimeout(timeout);

        if (e.data.error) {
          results[index] = { error: e.data.error };
          reject(new Error(e.data.error));
        } else {
          results[index] = e.data.result;
          resolve(e.data.result);
        }

        this.releaseWorker(workerPath, worker);
      };

      worker.onerror = (error: ErrorEvent) => {
        clearTimeout(timeout);
        results[index] = { error: error.message };
        reject(error);
        this.releaseWorker(workerPath, worker);
      };

      // Send the task to the worker
      worker.postMessage({
        type: "execute",
        index,
        data,
      });
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
    this.activeWorkers = 0;
    this.taskQueue = [];
  }
}
