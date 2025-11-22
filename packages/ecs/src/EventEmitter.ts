/**
 * Simple event emitter for internal ECS events
 * @internal
 */
export class EventEmitter<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<(data: any) => void>> = new Map();

  /**
   * Subscribe to an event
   * @param event - The event name to listen to
   * @param callback - The callback to invoke when the event is emitted
   */
  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from an event
   * @param event - The event name to stop listening to
   * @param callback - The callback to remove
   */
  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit an event to all listeners
   * @param event - The event name to emit
   * @param data - The data to pass to listeners
   * @internal
   */
  protected emit<K extends keyof T>(event: K, data: T[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }

  /**
   * Clear all event listeners
   * @internal
   */
  protected clearListeners(): void {
    this.listeners.clear();
  }
}
