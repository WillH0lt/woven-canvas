import { addComponent, type Context, defineQuery, hasComponent, removeComponent } from '@woven-ecs/core'
import { Aabb, Block, Held, HitGeometry, Hovered, Pointer } from '../../components'
import { defineEditorSystem } from '../../EditorSystem'
import { computeAabb, intersectPoint, isHeldByRemote } from '../../helpers'
import { Camera, Controls, Intersect, Mouse } from '../../singletons'

// Query for blocks that have changed (need AABB recalculation)
const blocksChanged = defineQuery((q) => q.tracking(Block))

const hitGeometryChanged = defineQuery((q) => q.tracking(HitGeometry))

// Query for held entities - track to re-evaluate hover when Held changes
const heldQuery = defineQuery((q) => q.with(Held).tracking(Held))

// Query for currently hovered entities
const hoveredQuery = defineQuery((q) => q.with(Hovered))

// Query for active pointers
const pointerQuery = defineQuery((q) => q.with(Pointer))

/**
 * Clear all Hovered components.
 */
function clearHovered(ctx: Context): void {
  for (const entityId of hoveredQuery.current(ctx)) {
    if (hasComponent(ctx, entityId, Hovered)) {
      removeComponent(ctx, entityId, Hovered)
    }
  }
}

/**
 * Find the first valid entity to hover from the intersect list.
 * Returns undefined if the topmost synced entity is held by a remote user,
 * to prevent accidentally grabbing blocks underneath.
 */
function findValidHoverTarget(ctx: Context, intersected: number[]): number | undefined {
  for (const entityId of intersected) {
    // If the topmost synced entity is held by remote, don't hover anything
    // This prevents accidentally grabbing blocks underneath held blocks
    if (isHeldByRemote(ctx, entityId)) return undefined

    return entityId
  }

  return undefined
}

/**
 * Update which entity has the Hovered component.
 */
function updateHovered(ctx: Context, intersected: number[]): void {
  // Only show hover when select tool is active
  const controls = Controls.read(ctx)
  const selectToolActive = controls.leftMouseTool === 'select'

  // Clear existing hovered entities
  clearHovered(ctx)

  if (!selectToolActive) return

  // Find first valid hover target (not held by remote)
  const newHoveredId = findValidHoverTarget(ctx, intersected)

  // Add hovered to new entity
  if (newHoveredId !== undefined) {
    addComponent(ctx, newHoveredId, Hovered, {})
  }
}

/**
 * Check if two arrays are equal.
 */
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const added = new Set<number>()
const changed = new Set<number>()

/**
 * Pre-capture intersect system - computes AABBs and detects mouse-block intersections.
 *
 * Runs early in the capture phase (priority: 100) to:
 * 1. Update AABB for blocks that have changed
 * 2. Find blocks under the mouse cursor
 * 3. Update the Intersect singleton
 * 4. Manage Hovered component on blocks
 *
 * Note: For test isolation, use createIntersectSystem() instead to get a fresh instance.
 */
export const intersectSystem = defineEditorSystem({ phase: 'capture', priority: 100 }, (ctx: Context) => {
  // Update AABBs for changed blocks
  added.clear()
  for (const entityId of blocksChanged.added(ctx)) {
    added.add(entityId)
  }
  for (const entityId of hitGeometryChanged.added(ctx)) {
    added.add(entityId)
  }

  changed.clear()
  for (const entityId of blocksChanged.changed(ctx)) {
    changed.add(entityId)
  }
  for (const entityId of hitGeometryChanged.changed(ctx)) {
    changed.add(entityId)
  }

  for (const entityId of added) {
    // Ensure block has Aabb component
    if (!hasComponent(ctx, entityId, Aabb)) {
      addComponent(ctx, entityId, Aabb, { value: [0, 0, 0, 0] })
    }

    const aabb = Aabb.write(ctx, entityId)
    computeAabb(ctx, entityId, aabb.value)
  }

  for (const entityId of changed) {
    const aabb = Aabb.write(ctx, entityId)
    computeAabb(ctx, entityId, aabb.value)
  }

  // Check if we need to update intersections
  const mouseDidMove = Mouse.didMove(ctx)
  const mouseDidLeave = Mouse.didLeave(ctx)
  const mouseDidScroll = Mouse.didScroll(ctx)
  const blocksHaveChanged = added.size > 0 || changed.size > 0

  // Check if Held changed (need to re-evaluate hover when blocks are released)
  const heldAdded = heldQuery.added(ctx)
  const heldRemoved = heldQuery.removed(ctx)
  const heldChanged = heldAdded.length > 0 || heldRemoved.length > 0

  // Only update if mouse moved, left, scrolled, blocks changed, or held state changed
  if (!mouseDidMove && !mouseDidLeave && !mouseDidScroll && !blocksHaveChanged && !heldChanged) {
    return
  }

  // Handle mouse leave - clear all intersections and hover
  if (mouseDidLeave) {
    Intersect.clear(ctx)
    clearHovered(ctx)
    return
  }

  // Get mouse position in world coordinates
  const mousePos = Mouse.getPosition(ctx)
  const worldPos = Camera.toWorld(ctx, mousePos)

  // Find intersected blocks (sorted by z-order, topmost first)
  const intersected = intersectPoint(ctx, worldPos)

  // Check if intersections changed
  const prevIntersected = Intersect.getAll(ctx)
  const intersectsChanged = !arraysEqual(intersected, prevIntersected)

  if (intersectsChanged) {
    // Update Intersect singleton
    Intersect.setAll(ctx, intersected)
  }

  // Don't change hover state while pointer is down
  // This prevents flickering when dragging objects
  const pointers = pointerQuery.current(ctx)
  if (pointers.length > 0) {
    return
  }

  // Update hovered entity if intersections or held state changed
  if (intersectsChanged || heldChanged) {
    updateHovered(ctx, intersected)
  }
})
