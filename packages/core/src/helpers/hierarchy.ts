import type { Vec2 } from '@woven-canvas/math'
import { type Context, type EntityId, getBackrefs, hasComponent, removeEntity } from '@woven-ecs/core'
import { Block } from '../components/Block'

/**
 * Get the world-space position of a block by walking up the parentId chain.
 * For root blocks (no parent), returns the block's position directly.
 * For child blocks, recursively adds parent positions.
 *
 * Delegates to Block.getWorldPosition() — this export provides a convenient
 * standalone function for use outside the Block component.
 */
export function getWorldPosition(ctx: Context, entityId: EntityId, out?: Vec2): Vec2 {
  return Block.getWorldPosition(ctx, entityId, out)
}

/**
 * Convert a world-space position to parent-local space for a given entity.
 * If the entity has no parent, returns the world position unchanged.
 */
export function worldToLocal(ctx: Context, entityId: EntityId, worldPos: Vec2, out?: Vec2): Vec2 {
  const result: Vec2 = out ?? [0, 0]
  const block = Block.read(ctx, entityId)
  const parentId = block.parentId

  if (parentId === null || !hasComponent(ctx, parentId, Block)) {
    result[0] = worldPos[0]
    result[1] = worldPos[1]
    return result
  }

  const parentWorld = getWorldPosition(ctx, parentId)
  result[0] = worldPos[0] - parentWorld[0]
  result[1] = worldPos[1] - parentWorld[1]
  return result
}

/**
 * Check if `candidateAncestor` is an ancestor of `entityId` in the parentId chain.
 */
export function isAncestor(ctx: Context, entityId: EntityId, candidateAncestor: EntityId): boolean {
  let current = entityId
  const visited = new Set<EntityId>()

  while (hasComponent(ctx, current, Block)) {
    const block = Block.read(ctx, current)
    const parentId = block.parentId
    if (parentId === null) break
    if (parentId === candidateAncestor) return true
    if (visited.has(parentId)) break // cycle safety
    visited.add(parentId)
    current = parentId
  }

  return false
}

/**
 * Get all direct children of a block (entities whose parentId points to it).
 */
export function getChildren(ctx: Context, parentId: EntityId): EntityId[] {
  return [...getBackrefs(ctx, parentId, Block, 'parentId')]
}

/**
 * Get all descendants of a block recursively (children, grandchildren, etc.).
 */
export function getDescendants(ctx: Context, parentId: EntityId): EntityId[] {
  const result: EntityId[] = []
  const children = getBackrefs(ctx, parentId, Block, 'parentId')
  for (const childId of children) {
    result.push(childId)
    result.push(...getDescendants(ctx, childId))
  }
  return result
}

/**
 * Recursively delete an entity and all its descendants.
 */
export function cascadeDelete(ctx: Context, entityId: EntityId): void {
  const children = getBackrefs(ctx, entityId, Block, 'parentId')
  for (const childId of children) {
    cascadeDelete(ctx, childId)
  }
  removeEntity(ctx, entityId)
}
