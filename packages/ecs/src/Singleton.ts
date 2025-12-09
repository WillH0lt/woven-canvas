import type { Context } from "./types";
import type { Component, ComponentDef } from "./Component";
import type { ComponentSchema, InferComponentType } from "./Component/types";
import { EventType } from "./EventBuffer";
import { SINGLETON_ENTITY_ID } from "./Component";

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
  private readonly singletonDef: ComponentDef<T>;

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
  constructor(singletonDef: ComponentDef<T>) {
    this.singletonDef = singletonDef;
  }

  /**
   * Get the singleton component instance from context.
   */
  private _getInstance(ctx: Context): Component<T> {
    const component = ctx.components[this.singletonDef.name] as
      | Component<T>
      | undefined;
    if (!component) {
      throw new Error(
        `Singleton "${this.singletonDef.name}" is not registered with this World.`
      );
    }
    if (!component.isSingleton) {
      throw new Error(
        `"${this.singletonDef.name}" is not a singleton. Use defineSingleton() to create singletons.`
      );
    }
    return component;
  }

  /**
   * Read the singleton's data (readonly access).
   *
   * @param ctx - The context object
   * @returns The readonly singleton data
   *
   * @example
   * ```typescript
   * const mouse = useSingleton(Mouse);
   *
   * function execute(ctx: Context) {
   *   const data = mouse.read(ctx);
   *   console.log(`Mouse at (${data.x}, ${data.y})`);
   * }
   * ```
   */
  read(ctx: Context): Readonly<InferComponentType<T>> {
    return this._getInstance(ctx).readSingleton();
  }

  /**
   * Write to the singleton's data.
   * Automatically triggers a change event for tracking.
   *
   * @param ctx - The context object
   * @returns The writable singleton data
   *
   * @example
   * ```typescript
   * const mouse = useSingleton(Mouse);
   *
   * function execute(ctx: Context) {
   *   const data = mouse.write(ctx);
   *   data.x = event.clientX;
   *   data.y = event.clientY;
   * }
   * ```
   */
  write(ctx: Context): InferComponentType<T> {
    return this._getInstance(ctx).writeSingleton();
  }

  /**
   * Copy data into the singleton.
   * Useful for batch initialization of multiple fields at once.
   * Automatically triggers a change event for tracking.
   *
   * @param ctx - The context object
   * @param data - The data to copy into the singleton
   *
   * @example
   * ```typescript
   * const mouse = useSingleton(Mouse);
   *
   * function execute(ctx: Context) {
   *   mouse.copy(ctx, { x: 100, y: 200 });
   * }
   * ```
   */
  copy(ctx: Context, data: T): void {
    this._getInstance(ctx).copySingleton(data);
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
    const component = this._getInstance(ctx);

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

    // Create a component mask for just this singleton's component
    const componentId = component.componentId;
    const byteIndex = componentId >> 3;
    const bitIndex = componentId & 7;
    const componentMask = new Uint8Array(byteIndex + 1);
    componentMask[byteIndex] = 1 << bitIndex;

    // Collect entities with CHANGED events for this component
    const { entities, newIndex } = ctx.eventBuffer.collectEntitiesInRange(
      this.lastScannedIndex,
      EventType.CHANGED,
      componentMask
    );

    // Check if our singleton entity is in the set
    const found = entities.has(SINGLETON_ENTITY_ID);

    // Update tracking state
    this.lastScannedIndex = newIndex;
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
 * @param singletonDef - The singleton component definition created with defineSingleton()
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
  singletonDef: ComponentDef<T>
): Singleton<T> {
  return new Singleton(singletonDef);
}
