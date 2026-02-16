import {
  Aabb,
  addComponent,
  Block,
  type Context,
  createEntity,
  defineEditorSystem,
  defineQuery,
  type EntityId,
  getBackrefs,
  hasComponent,
  intersectCapsule,
  Opacity,
  on,
  RankBounds,
  removeComponent,
  removeEntity,
  Synced,
} from '@infinitecanvas/core'
import { Aabb as AabbNs, Capsule, Vec2 } from '@infinitecanvas/math'

import { AddEraserStrokePoint, CancelEraserStroke, CompleteEraserStroke, StartEraserStroke } from '../commands'
import { Erased, EraserStroke, POINTS_CAPACITY } from '../components'
import { STROKE_RADIUS } from '../constants'
import { EraserStateSingleton } from '../singletons'

// Query for synced blocks with Aabb (for intersection testing)
const syncedBlocksQuery = defineQuery((q) => q.with(Block, Synced, Aabb))

// Query for erased entities
const erasedQuery = defineQuery((q) => q.with(Erased))

/**
 * Update eraser system - handles eraser commands and collision detection.
 *
 * Processes:
 * - StartEraserStroke: Create new stroke entity
 * - AddEraserStrokePoint: Add point to stroke, check for intersections
 * - CompleteEraserStroke: Delete all erased entities
 * - CancelEraserStroke: Restore all erased entities
 */
export const updateEraserSystem = defineEditorSystem({ phase: 'update' }, (ctx: Context) => {
  on(ctx, StartEraserStroke, (ctx, { worldPosition }) => {
    startStroke(ctx, worldPosition)
  })

  on(ctx, AddEraserStrokePoint, (ctx, { strokeId, worldPosition }) => {
    addStrokePoint(ctx, strokeId, worldPosition)
  })

  on(ctx, CompleteEraserStroke, (ctx, { strokeId }) => {
    completeStroke(ctx, strokeId)
  })

  on(ctx, CancelEraserStroke, (ctx, { strokeId }) => {
    cancelStroke(ctx, strokeId)
  })
})

/**
 * Start a new eraser stroke at the given position.
 */
function startStroke(ctx: Context, position: [number, number]): void {
  // Create stroke entity
  const strokeId = createEntity(ctx)

  // Add Block component so the stroke can be rendered
  addComponent(ctx, strokeId, Block, {
    tag: 'eraser',
    rank: RankBounds.genNext(ctx),
    position: [position[0] - STROKE_RADIUS, position[1] - STROKE_RADIUS],
    size: [STROKE_RADIUS * 2, STROKE_RADIUS * 2],
  })

  addComponent(ctx, strokeId, EraserStroke, {
    points: position,
    pointCount: 1,
    firstPointIndex: 0,
    radius: STROKE_RADIUS,
  })

  // Store reference to active stroke in state singleton
  const state = EraserStateSingleton.write(ctx)
  state.activeStroke = strokeId
  state.lastWorldPosition = position
}

/**
 * Add a point to the active eraser stroke and check for intersections.
 */
function addStrokePoint(ctx: Context, strokeId: EntityId, point: [number, number]): void {
  const stroke = EraserStroke.write(ctx, strokeId)

  // Get previous point for capsule creation
  const prevPointCount = stroke.pointCount
  const prevIndex = ((prevPointCount - 1) % POINTS_CAPACITY) * 2
  const prevX = stroke.points[prevIndex]
  const prevY = stroke.points[prevIndex + 1]

  // Add new point to circular buffer
  const nextIndex = (prevPointCount % POINTS_CAPACITY) * 2
  stroke.points[nextIndex] = point[0]
  stroke.points[nextIndex + 1] = point[1]
  stroke.pointCount++

  // Update first point index if we've exceeded capacity
  if (stroke.pointCount > POINTS_CAPACITY) {
    stroke.firstPointIndex = (stroke.pointCount - POINTS_CAPACITY) % POINTS_CAPACITY
  }

  // Update block bounds if Aabb doesn't contain the new point
  if (!Aabb.containsPoint(ctx, strokeId, point)) {
    Aabb.expandByPoint(ctx, strokeId, point)

    // Update block to match the expanded Aabb
    const { value: aabb } = Aabb.read(ctx, strokeId)
    const block = Block.write(ctx, strokeId)
    Vec2.set(block.position, AabbNs.left(aabb), AabbNs.top(aabb))
    Vec2.set(block.size, AabbNs.width(aabb), AabbNs.height(aabb))
  }

  // Skip intersection check if the point hasn't moved much
  const dx = point[0] - prevX
  const dy = point[1] - prevY
  const distSq = dx * dx + dy * dy
  if (distSq < 1) return // Skip if less than 1 pixel movement

  // Create capsule from previous point to current point
  const capsule = Capsule.create(prevX, prevY, point[0], point[1], STROKE_RADIUS)

  // Find all blocks that intersect with the capsule (excluding already erased)
  const candidates = filterNotErased(ctx, syncedBlocksQuery.current(ctx))
  const hits = intersectCapsule(ctx, capsule, candidates)

  // Mark all intersecting blocks as erased
  for (const entityId of hits) {
    markAsErased(ctx, entityId, strokeId)
  }
}

/**
 * Filter out entities that are already marked as erased.
 */
function* filterNotErased(ctx: Context, entityIds: Iterable<EntityId>): Iterable<EntityId> {
  for (const entityId of entityIds) {
    if (!hasComponent(ctx, entityId, Erased)) {
      yield entityId
    }
  }
}

/**
 * Mark an entity as erased by the stroke.
 */
function markAsErased(ctx: Context, entityId: EntityId, strokeId: EntityId): void {
  addComponent(ctx, entityId, Erased, {
    eraserStrokeId: strokeId,
  })

  addComponent(ctx, entityId, Opacity, {
    value: 80,
  })
}

/**
 * Complete the stroke - delete all erased entities.
 */
function completeStroke(ctx: Context, strokeId: EntityId): void {
  const erasedEntities = getBackrefs(ctx, strokeId, Erased, 'eraserStrokeId')

  // Delete erased entities
  for (const entityId of erasedEntities) {
    removeEntity(ctx, entityId)
  }

  // Delete stroke entity
  removeEntity(ctx, strokeId)
}

/**
 * Cancel the stroke - restore all erased entities.
 */
function cancelStroke(ctx: Context, strokeId: EntityId): void {
  // Remove Erased component from all entities marked by this stroke
  const erasedEntities: EntityId[] = []
  for (const entityId of erasedQuery.current(ctx)) {
    const erased = Erased.read(ctx, entityId)
    if (erased.eraserStrokeId === strokeId) {
      erasedEntities.push(entityId)
    }
  }

  for (const entityId of erasedEntities) {
    removeComponent(ctx, entityId, Erased)
    removeComponent(ctx, entityId, Opacity)
  }

  // Delete stroke entity
  removeEntity(ctx, strokeId)
}
