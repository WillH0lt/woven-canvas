import type { Context, EntityId } from "./types";
import type { Component, ComponentDef } from "./Component";
import type { ComponentSchema, InferComponentType } from "./Component/types";
import { NULL_REF } from "./Component/fields/ref";

/**
 * Ref packing constants (must match ref.ts)
 */
const ENTITY_ID_MASK = 0x01ffffff; // 25 bits

/**
 * Create a new entity in a worker thread.
 * Uses atomic operations to safely allocate an entity ID across threads.
 *
 * @param ctx - The context
 * @returns The newly created entity ID
 * @throws Error if the entity pool is exhausted
 *
 * @example
 * import { setupWorker, createEntity, type Context } from '@infinitecanvas/ecs';
 * import { Position } from './components';
 *
 * setupWorker(execute);
 *
 * function execute(ctx: Context) {
 *   const entityId = createEntity(ctx);
 *   Position.write(entityId, { x: 0, y: 0 });
 * }
 */
export function createEntity(ctx: Context): EntityId {
  const entityId = ctx.pool.get();

  ctx.entityBuffer.create(entityId);
  ctx.eventBuffer.pushAdded(entityId);

  return entityId;
}

/**
 * Get all entities that reference a target entity via a specific ref field.
 * This is useful for finding "children" or related entities.
 *
 * @param ctx - The context
 * @param targetEntity - The entity being referenced
 * @param componentDef - The component containing the ref field
 * @param fieldName - The name of the ref field
 * @returns Array of entity IDs that reference the target
 *
 * @example
 * ```typescript
 * import { getBackrefs, type Context } from '@infinitecanvas/ecs';
 *
 * const Child = defineComponent("Child", {
 *   parent: field.ref(),
 * });
 *
 * function getChildren(ctx: Context, parentId: EntityId): EntityId[] {
 *   return getBackrefs(ctx, parentId, Child, "parent");
 * }
 * ```
 */
export function getBackrefs<T extends ComponentSchema>(
  ctx: Context,
  targetEntity: EntityId,
  componentDef: ComponentDef<T>,
  fieldName: keyof T & string
): EntityId[] {
  const component = componentDef.getInstance(ctx);

  const results: EntityId[] = [];
  const buffer = (component.buffer as any)[fieldName] as Uint32Array;

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
 * The entity is marked as dead but its component data is preserved until
 * the ID is reclaimed and reused. This allows .removed() queries to still
 * read component data from recently removed entities.
 *
 * Ref fields use lazy validation: refs pointing to deleted entities are
 * automatically nullified when read, avoiding expensive scans on delete.
 *
 * ID reclamation happens automatically when the pool is exhausted.
 *
 * @param ctx - The context
 * @param entityId - The entity ID to remove
 *
 * @example
 * import { setupWorker, removeEntity, type Context } from '@infinitecanvas/ecs';
 *
 * setupWorker(execute);
 *
 * function execute(ctx: Context) {
 *   removeEntity(ctx, someEntityId);
 * }
 */
export function removeEntity(ctx: Context, entityId: EntityId): void {
  // Skip if already dead
  if (!ctx.entityBuffer.has(entityId)) {
    return;
  }

  // Emit the REMOVED event so queries can track this removal
  ctx.eventBuffer.pushRemoved(entityId);

  // Mark entity as dead but preserve component data
  // The ID will be reclaimed later when the pool is exhausted
  ctx.entityBuffer.markDead(entityId);
}

/**
 * Add a component to an entity.
 * Works on both main thread and worker threads.
 *
 * @param ctx - The context
 * @param entityId - The entity ID to add the component to
 * @param component - The component to add
 * @param data - Optional initial data for the component
 *
 * @example
 * import { addComponent, type Context } from '@infinitecanvas/ecs';
 * import { Position } from './components';
 *
 * function execute(ctx: Context) {
 *   addComponent(ctx, entityId, Position, { x: 0, y: 0 });
 * }
 */
export function addComponent<T extends ComponentSchema>(
  ctx: Context,
  entityId: EntityId,
  componentDef: ComponentDef<T>,
  data: Partial<InferComponentType<T>> = {} as any
): void {
  const component = componentDef.getInstance(ctx);
  ctx.entityBuffer.addComponentToEntity(entityId, component.componentId);
  component.copy(entityId, data as any);
  ctx.eventBuffer.pushComponentAdded(entityId, component.componentId);
}

/**
 * Remove a component from an entity.
 * Works on both main thread and worker threads.
 *
 * @param ctx - The context
 * @param entityId - The entity ID to remove the component from
 * @param component - The component to remove
 * @throws Error if the entity does not exist
 *
 * @example
 * import { removeComponent, type Context } from '@infinitecanvas/ecs';
 * import { Position } from './components';
 *
 * function execute(ctx: Context) {
 *   removeComponent(ctx, entityId, Position);
 * }
 */
export function removeComponent<T extends ComponentSchema>(
  ctx: Context,
  entityId: EntityId,
  componentDef: ComponentDef<T>
): void {
  if (!ctx.entityBuffer.has(entityId)) {
    throw new Error(`Entity with ID ${entityId} does not exist.`);
  }

  const component = componentDef.getInstance(ctx);
  ctx.entityBuffer.removeComponentFromEntity(entityId, component.componentId);
  ctx.eventBuffer.pushComponentRemoved(entityId, component.componentId);
}

/**
 * Check if an entity has a component.
 * Works on both main thread and worker threads.
 *
 * @param ctx - The context
 * @param entityId - The entity ID to check
 * @param component - The component to check for
 * @returns True if the entity has the component, false otherwise
 * @throws Error if the entity does not exist
 *
 * @example
 * import { hasComponent, type Context } from '@infinitecanvas/ecs';
 * import { Position } from './components';
 *
 * function execute(ctx: Context) {
 *   if (hasComponent(ctx, entityId, Position)) {
 *     // Entity has Position component
 *   }
 * }
 */
export function hasComponent<T extends ComponentSchema>(
  ctx: Context,
  entityId: EntityId,
  componentDef: ComponentDef<T>
): boolean {
  if (!ctx.entityBuffer.has(entityId)) {
    throw new Error(`Entity with ID ${entityId} does not exist.`);
  }

  const component = componentDef.getInstance(ctx);
  return ctx.entityBuffer.hasComponent(entityId, component.componentId);
}
