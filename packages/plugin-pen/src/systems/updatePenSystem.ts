import {
  Aabb,
  addComponent,
  Block,
  Color,
  type Context,
  createEntity,
  defineEditorSystem,
  defineQuery,
  type EditorResources,
  type EntityId,
  getResources,
  Held,
  HitGeometry,
  hasComponent,
  MAX_HIT_CAPSULES,
  on,
  RankBounds,
  removeComponent,
  removeEntity,
  Synced,
} from '@woven-canvas/core'
import { Aabb as AabbNs, Vec2 } from '@woven-canvas/math'
import simplify from 'simplify-js'

import { AddPenStrokePoint, CompletePenStroke, RemovePenStroke, StartPenStroke } from '../commands'
import { PenStroke, POINTS_CAPACITY } from '../components'
import { PenStateSingleton } from '../singletons'

const penStrokesQuery = defineQuery((q) => q.tracking(PenStroke))

/**
 * Update pen system - handles pen commands and stroke management.
 *
 * Processes:
 * - StartPenStroke: Create new stroke entity
 * - AddPenStrokePoint: Add point to stroke with pressure, expand bounds
 * - CompletePenStroke: Mark complete and generate hit geometry
 * - RemovePenStroke: Delete stroke entity
 */
export const updatePenSystem = defineEditorSystem({ phase: 'update' }, (ctx: Context) => {
  on(ctx, StartPenStroke, (ctx, { worldPosition, pressure, thickness }) => {
    startStroke(ctx, worldPosition, pressure, thickness)
  })

  on(ctx, AddPenStrokePoint, (ctx, { strokeId, worldPosition, pressure }) => {
    addStrokePoint(ctx, strokeId, worldPosition, pressure)
  })

  on(ctx, CompletePenStroke, (ctx, { strokeId }) => {
    completeStroke(ctx, strokeId)
  })

  on(ctx, RemovePenStroke, (ctx, { strokeId }) => {
    removeStroke(ctx, strokeId)
  })

  for (const entityId of penStrokesQuery.addedOrChanged(ctx)) {
    const stroke = PenStroke.read(ctx, entityId)
    if (stroke.isComplete) {
      generateHitGeometry(ctx, entityId)
    }
  }
})

/**
 * Start a new pen stroke at the given position.
 */
function startStroke(ctx: Context, position: [number, number], pressure: number | null, thickness: number): void {
  const radius = thickness / 2

  // Create stroke entity
  const strokeId = createEntity(ctx)

  // Add Synced component for persistence
  addComponent(ctx, strokeId, Synced, {
    id: crypto.randomUUID(),
  })

  // Add Block component so the stroke can be rendered
  addComponent(ctx, strokeId, Block, {
    tag: 'pen-stroke',
    rank: RankBounds.genNext(ctx),
    position: [position[0] - radius, position[1] - radius],
    size: [radius * 2, radius * 2],
  })

  // Add Color component for stroke color
  addComponent(ctx, strokeId, Color, {})

  // Add Held component to indicate this stroke is being drawn
  const { sessionId } = getResources<EditorResources>(ctx)
  addComponent(ctx, strokeId, Held, { sessionId })

  // Determine if we have pressure data
  const hasPressure = pressure !== null
  const initialPressure = hasPressure ? pressure : 0.5

  addComponent(ctx, strokeId, PenStroke, {
    points: position,
    pressures: [initialPressure],
    pointCount: 1,
    thickness,
    originalLeft: position[0] - radius,
    originalTop: position[1] - radius,
    originalWidth: radius * 2,
    originalHeight: radius * 2,
    isComplete: false,
    hasPressure,
  })

  // Store reference to active stroke in state singleton
  const state = PenStateSingleton.write(ctx)
  state.activeStroke = strokeId
  state.lastWorldPosition = position
}

/**
 * Add a point to the active pen stroke.
 */
function addStrokePoint(ctx: Context, strokeId: EntityId, point: [number, number], pressure: number | null): void {
  const stroke = PenStroke.write(ctx, strokeId)

  const nextIndex = stroke.pointCount

  // Check if we've exceeded capacity
  if (nextIndex >= POINTS_CAPACITY) return

  // Add point to buffer
  stroke.points[nextIndex * 2] = point[0]
  stroke.points[nextIndex * 2 + 1] = point[1]

  // Add pressure (use 0.5 as default if no pressure data)
  if (pressure !== null) {
    stroke.pressures[nextIndex] = pressure
  } else {
    stroke.pressures[nextIndex] = 0.5
  }

  stroke.pointCount++

  // Update bounds if point is outside current Aabb
  if (!Aabb.containsPoint(ctx, strokeId, point)) {
    Aabb.expandByPoint(ctx, strokeId, point)

    // Update block to match the expanded Aabb
    const { value: aabb } = Aabb.read(ctx, strokeId)
    const block = Block.write(ctx, strokeId)
    Vec2.set(block.position, AabbNs.left(aabb), AabbNs.top(aabb))
    Vec2.set(block.size, AabbNs.width(aabb), AabbNs.height(aabb))

    // Update original bounds for affine transform calculations
    stroke.originalLeft = block.position[0]
    stroke.originalTop = block.position[1]
    stroke.originalWidth = block.size[0]
    stroke.originalHeight = block.size[1]
  }
}

/**
 * Complete the stroke - mark as finished and generate hit geometry.
 */
function completeStroke(ctx: Context, strokeId: EntityId): void {
  const stroke = PenStroke.write(ctx, strokeId)
  stroke.isComplete = true

  // Remove Held component now that drawing is complete
  removeComponent(ctx, strokeId, Held)

  // Generate hit geometry for collision detection
  generateHitGeometry(ctx, strokeId)
}

/**
 * Remove the stroke entity.
 */
function removeStroke(ctx: Context, strokeId: EntityId): void {
  removeEntity(ctx, strokeId)
}

/**
 * Generate hit geometry for the completed stroke.
 *
 * Simplifies the stroke points and creates capsules for collision detection.
 * Iteratively increases tolerance until the result fits within MAX_HIT_CAPSULES.
 */
function generateHitGeometry(ctx: Context, strokeId: EntityId): void {
  const stroke = PenStroke.read(ctx, strokeId)

  // Build array of points for simplification
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < stroke.pointCount; i++) {
    points.push({
      x: stroke.points[i * 2],
      y: stroke.points[i * 2 + 1],
    })
  }

  // Simplify points, doubling tolerance until we fit within MAX_HIT_CAPSULES
  let tolerance = stroke.thickness
  let simplifiedPoints = simplify(points, tolerance, false)

  while (simplifiedPoints.length - 1 > MAX_HIT_CAPSULES) {
    tolerance *= 2
    simplifiedPoints = simplify(points, tolerance, false)
  }

  // Ensure we have at least 2 points for a capsule
  if (simplifiedPoints.length === 1) {
    const pt = simplifiedPoints[0]
    simplifiedPoints.push({ x: pt.x, y: pt.y })
  }

  // Add HitGeometry component if not present
  if (!hasComponent(ctx, strokeId, HitGeometry)) {
    addComponent(ctx, strokeId, HitGeometry, {})
  } else {
    HitGeometry.clear(ctx, strokeId)
  }

  // Create capsules from simplified points using ORIGINAL bounds for UV conversion.
  // stroke.points are stored in original world coordinates, so we must use
  // originalLeft/Top/Width/Height (not current Block bounds) for correct UVs.
  const { originalLeft, originalTop, originalWidth, originalHeight } = stroke

  for (let i = 0; i < simplifiedPoints.length - 1; i++) {
    const p0 = simplifiedPoints[i]
    const p1 = simplifiedPoints[i + 1]

    // Convert original world coords to UV using original bounds
    const uv0: [number, number] = [(p0.x - originalLeft) / originalWidth, (p0.y - originalTop) / originalHeight]
    const uv1: [number, number] = [(p1.x - originalLeft) / originalWidth, (p1.y - originalTop) / originalHeight]

    HitGeometry.addCapsuleUv(ctx, strokeId, uv0, uv1, stroke.thickness)
  }
}
