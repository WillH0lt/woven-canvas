/**
 * Base class for parallel systems that run in web workers.
 * Extend this class in your worker file and implement the execute method.
 *
 * @example
 * // In your worker file (e.g., myWorker.ts):
 * import { ParallelSystemBase } from '@infinitecanvas/ecs';
 *
 * class MyParallelSystem extends ParallelSystemBase {
 *   execute() {
 *     // Your parallel computation here
 *     console.log('Running in worker!');
 *   }
 * }
 *
 * // Initialize the worker
 * new MyParallelSystem();
 */
export abstract class ParallelSystemBase {
  constructor() {
    // Set up message handler for communication with main thread
    self.onmessage = (e: MessageEvent) => {
      this.handleMessage(e);
    };
  }

  /**
   * Handle incoming messages from the main thread
   */
  private handleMessage(e: MessageEvent): void {
    const { type, index, data } = e.data;

    try {
      if (type === "execute") {
        // Execute the system
        this.execute(data);
        this.sendResult(index);
      }
    } catch (error: any) {
      this.sendError(index, error.message);
    }
  }

  /**
   * Send a successful result back to the main thread
   */
  private sendResult(index: number): void {
    self.postMessage({ index, result: true });
  }

  /**
   * Send an error back to the main thread
   */
  private sendError(index: number, error: string): void {
    self.postMessage({ index, error });
  }

  /**
   * Execute the parallel system logic.
   * Override this method in your worker class.
   * @param data - Optional data passed from the main thread
   */
  abstract execute(data?: any): void | Promise<void>;
}
