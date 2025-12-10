import type { Context, EntityId } from "./types";
import type { Component, ComponentDef } from "./Component";
import type { ComponentSchema, InferComponentType } from "./Component/types";
import { NULL_REF } from "./Component/fields/ref";

const ENTITY_ID_MASK = 0x01ffffff;

/**
 * Create a new entity
 * @param ctx - The context
 * @returns Newly created entity ID
 * @throws Error if entity pool exhausted
 * @example
 * ```typescript
 * const entityId = createEntity(ctx);
 * ```
 */
export function createEntity(ctx: Context): EntityId {
  const entityId = ctx.pool.get();

  ctx.entityBuffer.create(entityId);
  ctx.eventBuffer.pushAdded(entityId);

  return entityId;
}

/**
 * Get entities that reference a target entity via a ref field.
 * Useful for finding "children" or related entities.
 * @param ctx - The context
 * @param targetEntity - Entity being referenced
 * @param componentDef - Component containing the ref field
 * @param fieldName - Name of the ref field
 * @returns Array of entity IDs that reference the target
 * @example
 * ```typescript
 * const Child = defineComponent("Child", {
 *   parent: field.ref(),
 * });
 *
 * const childrenIds = getBackrefs(ctx, parentId, Child, "parent");
 * ```
 */
export function getBackrefs<T extends ComponentSchema>(
  ctx: Context,
  targetEntity: EntityId,
  componentDef: ComponentDef<T>,
  fieldName: keyof T & string
): EntityId[] {
  const component = componentDef._getInstance(ctx);

  const results: EntityId[] = [];
  const buffer = component.buffer[fieldName] as Uint32Array;

  // Scan all alive entities that have this component
  for (let eid = 0; eid < ctx.maxEntities; eid++) {
    if (
      ctx.entityBuffer.has(eid) &&
      ctx.entityBuffer.hasComponent(eid, component.componentId)
    ) {
      const packedRef = buffer[eid];
      if (packedRef !== NULL_REF) {
        // Unpack the entity ID from the ref
        const refEntityId = packedRef & ENTITY_ID_MASK;
        if (refEntityId === targetEntity) {
          results.push(eid);
        }
      }
    }
  }

  return results;
}

/**
 * Remove an entity.
 * The entity is marked as dead but component data is preserved until ID reclamation.
 * This allows .removed() queries to read component data from recently deleted entities.
 * Refs use lazy validation - refs to deleted entities are nullified on read.
 * @param ctx - The context
 * @param entityId - Entity ID to remove
 * @example
 * ```typescript
 * removeEntity(ctx, entityId);
 * ```
 */
export function removeEntity(ctx: Context, entityId: EntityId): void {
  if (!ctx.entityBuffer.has(entityId)) {
    return;
  }

  ctx.eventBuffer.pushRemoved(entityId);

  // Mark entity as dead but preserve component data
  // The ID will be reclaimed later when the pool is exhausted
  ctx.entityBuffer.markDead(entityId);
}

/**
 * Add a component to an entity
 * @param ctx - The context
 * @param entityId - Entity ID
 * @param component - Component to add
 * @param data - Optional initial component data
 * @example
 * ```typescript
 *   addComponent(ctx, entityId, Position, { x: 0, y: 0 });
 * ```
 */
export function addComponent<T extends ComponentSchema>(
  ctx: Context,
  entityId: EntityId,
  componentDef: ComponentDef<T>,
  data: Partial<InferComponentType<T>> = {} as any
): void {
  const component = componentDef._getInstance(ctx);
  ctx.entityBuffer.addComponentToEntity(entityId, component.componentId);
  component.copy(entityId, data as any);
  ctx.eventBuffer.pushComponentAdded(entityId, component.componentId);
}

/**
 * Remove a component from an entity
 * @param ctx - The context
 * @param entityId - Entity ID
 * @param component - Component to remove
 * @throws Error if entity doesn't exist
 * @example
 * ```typescript
 * removeComponent(ctx, entityId, Position);
 * ```
 */
export function removeComponent<T extends ComponentSchema>(
  ctx: Context,
  entityId: EntityId,
  componentDef: ComponentDef<T>
): void {
  if (!ctx.entityBuffer.has(entityId)) {
    throw new Error(`Entity with ID ${entityId} does not exist.`);
  }

  const component = componentDef._getInstance(ctx);
  ctx.entityBuffer.removeComponentFromEntity(entityId, component.componentId);
  ctx.eventBuffer.pushComponentRemoved(entityId, component.componentId);
}

/**
 * Check if an entity has a component
 * @param ctx - The context
 * @param entityId - Entity ID to check
 * @param component - Component to check for
 * @returns True if entity has the component
 * @throws Error if entity doesn't exist
 * @example
 * ```typescript
 * if (hasComponent(ctx, entityId, Position)) {
 *   // Entity has Position
 * }
 * ```
 */
export function hasComponent<T extends ComponentSchema>(
  ctx: Context,
  entityId: EntityId,
  componentDef: ComponentDef<T>
): boolean {
  if (!ctx.entityBuffer.has(entityId)) {
    throw new Error(`Entity with ID ${entityId} does not exist.`);
  }

  const component = componentDef._getInstance(ctx);
  return ctx.entityBuffer.hasComponent(entityId, component.componentId);
}

/**
 * Get typed resources from the context.
 * Resources are user-defined data passed to the World constructor.
 * @typeParam R - The expected resources type
 * @param ctx - The context
 * @returns The resources cast to type R
 * @example
 * ```typescript
 * interface Resources {
 *   maxParticles: number;
 *   debugMode: boolean;
 * }
 *
 * const world = new World([Position], {
 *   resources: { maxParticles: 1000, debugMode: true }
 * });
 *
 * const mySystem = defineSystem((ctx) => {
 *   const resources = getResources<Resources>(ctx);
 *   console.log(resources.maxParticles); // 1000
 * });
 * ```
 */
export function getResources<R>(ctx: Context): R {
  return ctx.resources as R;
}
