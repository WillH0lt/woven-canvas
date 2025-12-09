import type { ComponentDef, SingletonDef } from "../Component";
import type { Context } from "../types";
import { QueryMasks } from "../types";
import type { ComponentSchema } from "../Component/types";

/**
 * Helper to create an empty mask array
 */
function createEmptyMask(bytes: number): Uint8Array {
  return new Uint8Array(bytes);
}

/**
 * Helper to set a component bit in a mask array
 * Component bits are packed 8 per byte
 */
function setComponentBit(mask: Uint8Array, componentId: number): void {
  const byteIndex = Math.floor(componentId / 8);
  const bitIndex = componentId % 8;

  if (byteIndex < mask.length) {
    mask[byteIndex] |= 1 << bitIndex;
  }
}

/**
 * Query builder for filtering entities based on component composition
 * Uses Uint8Array bitmask operations for efficient matching (8 components per byte)
 */
export class QueryBuilder {
  private withMask: Uint8Array;
  private withoutMask: Uint8Array;
  private anyMask: Uint8Array;
  private trackingMask: Uint8Array;
  private ctx: Context;

  constructor(componentCount: number, ctx: Context) {
    const bytes = Math.ceil(componentCount / 8);

    this.withMask = createEmptyMask(bytes);
    this.withoutMask = createEmptyMask(bytes);
    this.anyMask = createEmptyMask(bytes);
    this.trackingMask = createEmptyMask(bytes);
    this.ctx = ctx;
  }

  /**
   * Get the component ID from the context for a given ComponentDef or SingletonDef
   */
  private getComponentId(
    componentDef: ComponentDef<ComponentSchema> | SingletonDef<ComponentSchema>
  ): number {
    const component = this.ctx.components[componentDef.name];
    if (!component) {
      throw new Error(
        `Component "${componentDef.name}" is not registered with this World.`
      );
    }
    return component.componentId;
  }

  /**
   * Require entities to have all of the specified components
   * @param componentDefs - Components or singletons that must be present
   * @returns This query builder for chaining
   */
  with(...componentDefs: ComponentDef<any>[]): this {
    for (const componentDef of componentDefs) {
      setComponentBit(this.withMask, this.getComponentId(componentDef));
    }
    return this;
  }

  /**
   * Require entities to NOT have any of the specified components
   * @param componentDefs - Components or singletons that must NOT be present
   * @returns This query builder for chaining
   */
  without(...componentDefs: ComponentDef<any>[]): this {
    for (const componentDef of componentDefs) {
      setComponentBit(this.withoutMask, this.getComponentId(componentDef));
    }
    return this;
  }

  /**
   * Require entities to have at least one of the specified components
   * @param componentDefs - Components or singletons where at least one must be present
   * @returns This query builder for chaining
   */
  any(...componentDefs: ComponentDef<any>[]): this {
    for (const componentDef of componentDefs) {
      setComponentBit(this.anyMask, this.getComponentId(componentDef));
    }
    return this;
  }

  /**
   * Require entities to have all of the specified components AND track changes to them
   * When a tracked component's value changes, the entity will appear in query.changed
   * This combines the functionality of with() and tracking()
   * @param componentDefs - Components or singletons that must be present and should be tracked for changes
   * @returns This query builder for chaining
   */
  tracking(...componentDefs: (ComponentDef<any> | SingletonDef<any>)[]): this {
    for (const componentDef of componentDefs) {
      const componentId = this.getComponentId(componentDef);
      setComponentBit(this.withMask, componentId);
      setComponentBit(this.trackingMask, componentId);
    }
    return this;
  }

  /**
   * Build the query matcher
   * @internal
   */
  _build(): QueryMasks {
    // Pre-compute whether each mask has any non-zero values
    // This allows fast-path skipping in EntityBuffer.matches()
    const hasTracking = !this.trackingMask.every((byte) => byte === 0);
    const hasWith = !this.withMask.every((byte) => byte === 0);
    const hasWithout = !this.withoutMask.every((byte) => byte === 0);
    const hasAny = !this.anyMask.every((byte) => byte === 0);

    return new QueryMasks(
      this.trackingMask,
      this.withMask,
      this.withoutMask,
      this.anyMask,
      hasTracking,
      hasWith,
      hasWithout,
      hasAny
    );
  }
}
