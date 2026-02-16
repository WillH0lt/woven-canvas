import {
  addComponent,
  Block,
  type Context,
  defineQuery,
  type EditorResources,
  type EntityId,
  getResources,
  Held,
  hasComponent,
  isHeldByRemote,
  removeComponent,
} from '@woven-canvas/core'

import { Selected } from '../components'

const selectedQuery = defineQuery((q) => q.with(Selected))
const blockQuery = defineQuery((q) => q.with(Block))

/**
 * Add Selected and Held components to an entity.
 * Does nothing if the entity already has the Selected component.
 * Does nothing if held by a remote user.
 * If already held by the local user (from dragging), only adds Selected.
 *
 * @param ctx - The ECS context
 * @param entityId - The entity to select
 */
export function selectBlock(ctx: Context, entityId: EntityId): void {
  if (hasComponent(ctx, entityId, Selected)) return
  // Don't select if held by a remote user
  if (isHeldByRemote(ctx, entityId)) return

  const { sessionId } = getResources<EditorResources>(ctx)
  addComponent(ctx, entityId, Selected, {})
  // Only add Held if not already held (might be held by us from dragging)
  if (!hasComponent(ctx, entityId, Held)) {
    addComponent(ctx, entityId, Held, { sessionId })
  }
}

/**
 * Remove Selected and Held components from an entity.
 *
 * @param ctx - The ECS context
 * @param entityId - The entity to deselect
 */
export function deselectBlock(ctx: Context, entityId: EntityId): void {
  if (!hasComponent(ctx, entityId, Selected)) return

  removeComponent(ctx, entityId, Selected)
  removeComponent(ctx, entityId, Held)
}

/**
 * Deselect all currently selected entities.
 *
 * @param ctx - The ECS context
 */
export function deselectAll(ctx: Context): void {
  for (const entityId of selectedQuery.current(ctx)) {
    deselectBlock(ctx, entityId)
  }
}

/**
 * Select all blocks in the document.
 * Skips blocks held by remote users.
 *
 * @param ctx - The ECS context
 */
export function selectAll(ctx: Context): void {
  for (const entityId of blockQuery.current(ctx)) {
    selectBlock(ctx, entityId)
  }
}
