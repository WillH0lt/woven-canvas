import type { Context } from "./types";
import type { Component } from "./Component";
import type { ComponentSchema, InferComponentType } from "./Component/types";
import { EventType } from "./EventBuffer";
import { SINGLETON_ENTITY_ID } from "./Component";
import { initializeComponentInWorker } from "./Worker";

/**
 * A reference to a singleton with its own change tracking state.
 * Created via useSingleton() and works similarly to Query.
 * Each Singleton instance tracks changes independently, so multiple
 * systems can each detect when a singleton has changed.
 *
 * @example
 * ```typescript
 * import { useSingleton } from "@infinitecanvas/ecs";
 * import { Mouse } from "./singletons";
 *
 * const mouse = useSingleton(Mouse);
 *
 * function execute(ctx: Context) {
 *   if (mouse.changed(ctx)) {
 *     const data = mouse.read(ctx);
 *     console.log(`Mouse moved to (${data.x}, ${data.y})`);
 *   }
 * }
 * ```
 */
export class Singleton<T extends ComponentSchema> {
  private readonly singleton: Component<T>;

  /**
   * Tracks the last scanned index in the event buffer.
   * Used to efficiently scan only new events since the last check.
   */
  private lastScannedIndex: number = 0;

  /**
   * The tick number at the time of the last changed() call.
   * Used to cache results within the same tick.
   */
  private lastChangedTick: number = -1;

  /**
   * Cached result from the last changed() check in this tick.
   */
  private cachedChanged: boolean = false;

  /**
   * Whether this singleton ref has been initialized (first use).
   */
  private initialized: boolean = false;

  /**
   * @internal
   */
  constructor(singleton: Component<T>) {
    this.singleton = singleton;
  }

  /**
   * Ensure the singleton is initialized in the current context.
   */
  private ensureInitialized(): void {
    if (!this.singleton.isSingleton) {
      throw new Error(
        `"${this.singleton.name}" is not a singleton. Use defineSingleton() to create singletons.`
      );
    }

    if (this.singleton.isInitialized()) {
      return;
    }

    // Try to initialize from worker transfer data
    if (!initializeComponentInWorker(this.singleton)) {
      throw new Error(
        `Singleton "${this.singleton.name}" could not be initialized. ` +
          `Make sure it's registered with the World on the main thread.`
      );
    }
  }

  /**
   * Read the singleton's data (readonly access).
   * Lazily initializes the singleton in workers if needed.
   *
   * @param ctx - The context object
   * @returns The readonly singleton data
   *
   * @example
   * ```typescript
   * const mouse = useSingleton(Mouse);
   *
   * function execute() {
   *   const data = mouse.read();
   *   console.log(`Mouse at (${data.x}, ${data.y})`);
   * }
   * ```
   */
  read(): Readonly<InferComponentType<T>> {
    this.ensureInitialized();
    return this.singleton.readSingleton();
  }

  /**
   * Write to the singleton's data.
   * Lazily initializes the singleton in workers if needed.
   * Automatically triggers a change event for tracking.
   *
   * @param ctx - The context object
   * @returns The writable singleton data
   *
   * @example
   * ```typescript
   * const mouse = useSingleton(Mouse);
   *
   * function execute() {
   *   const data = mouse.write();
   *   data.x = event.clientX;
   *   data.y = event.clientY;
   * }
   * ```
   */
  write(): InferComponentType<T> {
    this.ensureInitialized();
    return this.singleton.writeSingleton();
  }

  /**
   * Check if the singleton has changed since the last time this
   * Singleton checked. Each Singleton tracks independently,
   * so multiple systems can each see the change once.
   *
   * @param ctx - The context object
   * @returns True if the singleton was written to since last check
   *
   * @example
   * ```typescript
   * const mouse = useSingleton(Mouse);
   *
   * function execute(ctx: Context) {
   *   if (mouse.changed(ctx)) {
   *     const data = mouse.read(ctx);
   *     console.log(`Mouse moved to (${data.x}, ${data.y})`);
   *   }
   * }
   * ```
   */
  changed(ctx: Context): boolean {
    this.ensureInitialized();

    // Initialize on first use - set lastScannedIndex to current position
    // so we don't report changes that happened before this ref was first used
    if (!this.initialized) {
      this.lastScannedIndex = ctx.eventBuffer.getWriteIndex();
      this.initialized = true;
      return false;
    }

    // If already checked this tick, return cached result
    if (this.lastChangedTick === ctx.tick) {
      return this.cachedChanged;
    }

    const currentWriteIndex = ctx.eventBuffer.getWriteIndex();

    // No new events since last check
    if (currentWriteIndex === this.lastScannedIndex) {
      this.lastChangedTick = ctx.tick;
      this.cachedChanged = false;
      return false;
    }

    // Scan for CHANGED events with our singleton's entity ID and component ID
    const componentId = this.singleton.componentId;
    let found = false;

    for (const event of ctx.eventBuffer.getEventsInRange(
      this.lastScannedIndex,
      currentWriteIndex,
      EventType.CHANGED
    )) {
      if (
        event.entityId === SINGLETON_ENTITY_ID &&
        event.componentId === componentId
      ) {
        found = true;
        break;
      }
    }

    // Update tracking state
    this.lastScannedIndex = currentWriteIndex;
    this.lastChangedTick = ctx.tick;
    this.cachedChanged = found;

    return found;
  }
}

/**
 * Create a singleton reference with independent change tracking.
 * Similar to useQuery(), each useSingleton() call creates a new
 * reference that tracks changes independently.
 *
 * @param singleton - The singleton component created with defineSingleton()
 * @returns A Singleton for reading, writing, and tracking changes
 *
 * @example
 * ```typescript
 * import { useSingleton, defineSingleton, field } from "@infinitecanvas/ecs";
 *
 * const Mouse = defineSingleton("Mouse", {
 *   x: field.float32(),
 *   y: field.float32(),
 * });
 *
 * // Each useSingleton creates an independent tracker
 * const mouseRef = useSingleton(Mouse);
 *
 * function execute(ctx: Context) {
 *   if (mouseRef.changed(ctx)) {
 *     const mouse = mouseRef.read(ctx);
 *     console.log(`Mouse at (${mouse.x}, ${mouse.y})`);
 *   }
 * }
 * ```
 */
export function useSingleton<T extends ComponentSchema>(
  singleton: Component<T>
): Singleton<T> {
  return new Singleton(singleton);
}
