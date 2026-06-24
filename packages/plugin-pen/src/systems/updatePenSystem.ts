import {
  Aabb,
  addComponent,
  Block,
  Camera,
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
  MAX_HIT_POLYGON_POINTS,
  on,
  PlaceBlockEvent,
  RankBounds,
  removeComponent,
  removeEntity,
  Synced,
} from '@woven-canvas/core'
import { Aabb as AabbNs, Vec2 } from '@woven-canvas/math'

import { AddPenStrokePoint, CompletePenStroke, RemovePenStroke, StartPenStroke } from '../commands'
import { PenStroke, POINTS_CAPACITY } from '../components'
import { PenPresetSingleton, PenStateSingleton } from '../singletons'
import { PenStrokeKind } from '../types'

const penStrokesQuery = defineQuery((q) => q.tracking(PenStroke))

/**
 * Live point-simplification tuning, expressed in *screen pixels* and divided by
 * the camera zoom at sample time so perceived fidelity is constant at any zoom.
 *
 * The simplifier is an online Reumann–Witkam "sleeve": every pointer move
 * overwrites a single provisional tail point so the stroke tip always tracks the
 * cursor exactly (fully responsive), and a point is only committed to the buffer
 * when the cursor leaves a tolerance corridor around the current direction. A
 * straight drag therefore stores 2 points; curves store points proportional to
 * their curvature.
 */
const SIMPLIFY_TOLERANCE_PX = 0.75
/** Minimum travel from the anchor before a sleeve direction is trusted (px). */
const MIN_DIRECTION_DISTANCE_PX = 4

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
  on(ctx, StartPenStroke, (ctx, { worldPosition, pressure }) => {
    startStroke(ctx, worldPosition, pressure)
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
 * True only for a fully finite world position. Pointer samples taken while the
 * camera transform is momentarily undefined (e.g. mid pan/zoom, or before the
 * viewport has measured) can arrive as `NaN`/`Infinity`. A non-finite point
 * frozen into the buffer is invisible while drawing — perfect-freehand skips it
 * and the GPU discards its degenerate triangles — but `JSON.stringify` turns it
 * into `null`, which deserializes back as `0`, so the stroke springs a stray
 * vertex at the world origin the next time the document loads. Reject such
 * samples at the single point of entry rather than letting them persist.
 */
function isFinitePoint(point: [number, number]): boolean {
  return Number.isFinite(point[0]) && Number.isFinite(point[1])
}

/**
 * Start a new pen stroke at the given position.
 */
function startStroke(ctx: Context, position: [number, number], pressure: number | null): void {
  // A non-finite start would seed the whole stroke (and its bounds) with NaN —
  // see isFinitePoint. Ignore the gesture; the next finite pointerdown starts cleanly.
  if (!isFinitePoint(position)) return

  // Brush thickness and color are read from the live PenPresetSingleton so
  // consumers can drive them from UI (slider, color picker) without having
  // to plumb the values through commands.
  const preset = PenPresetSingleton.read(ctx)
  const { thickness, kind } = preset
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

  // Add Color component populated from the preset.
  addComponent(ctx, strokeId, Color, {
    red: preset.red,
    green: preset.green,
    blue: preset.blue,
    alpha: preset.alpha,
  })

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
    kind,
  })

  // Place into the page (frame + layer handled by PlaceBlockEvent, from the stroke's position).
  PlaceBlockEvent.spawn(ctx, { entityId: strokeId })

  // Store reference to active stroke in state singleton
  const state = PenStateSingleton.write(ctx)
  state.activeStroke = strokeId
  state.lastWorldPosition = position
  // Reset the simplifier's sleeve — direction is re-established on the first moves.
  state.sleeveDir = [0, 0]
}

/**
 * Add a point to the active pen stroke, applying live simplification.
 *
 * The last slot in the points buffer is always a *provisional tail*: it is
 * rewritten to the live cursor on every move so the stroke tip stays glued to
 * the pointer. A point is only permanently committed (the tail is "frozen" and a
 * fresh tail appended) when the cursor leaves the sleeve corridor around the
 * current drawing direction — i.e. at genuine bends. This keeps long straight
 * runs down to two points while preserving curvature, with no perceptible lag.
 *
 * See {@link SIMPLIFY_TOLERANCE_PX} for the algorithm overview.
 */
function addStrokePoint(ctx: Context, strokeId: EntityId, point: [number, number], pressure: number | null): void {
  // Drop non-finite samples before they touch the buffer — see isFinitePoint.
  // Skipping the point keeps the previous provisional tail intact, so the live
  // tip simply doesn't jump for that one frame.
  if (!isFinitePoint(point)) return

  const stroke = PenStroke.write(ctx, strokeId)
  const count = stroke.pointCount
  const px = point[0]
  const py = point[1]
  const pr = pressure !== null ? pressure : 0.5

  // The point buffer is full: the stroke can grow no further. Finalize it (once)
  // and stop accepting points, rather than endlessly sliding the provisional
  // tail. Clearing activeStroke makes the capture machine stop feeding points
  // and prevents pointerUp from completing the stroke a second time.
  if (count >= POINTS_CAPACITY) {
    if (!stroke.isComplete) {
      completeStroke(ctx, strokeId)
      PenStateSingleton.write(ctx).activeStroke = null
    }
    return
  }

  // Tolerances in world units: a fixed screen-pixel budget scaled by zoom.
  const zoom = Camera.read(ctx).zoom || 1
  const tolerance = SIMPLIFY_TOLERANCE_PX / zoom
  const minDirectionDistance = MIN_DIRECTION_DISTANCE_PX / zoom

  // First move after StartPenStroke: seed the provisional tail (index 1).
  if (count === 1) {
    writePoint(stroke, count, px, py, pr)
    stroke.pointCount = count + 1
    expandBoundsToPoint(ctx, strokeId, stroke, point)
    return
  }

  const state = PenStateSingleton.write(ctx)
  const dir = state.sleeveDir
  const tailIdx = count - 1
  const ax = stroke.points[(count - 2) * 2]
  const ay = stroke.points[(count - 2) * 2 + 1]

  if (dir[0] === 0 && dir[1] === 0) {
    // No trusted direction yet (stroke start, or just after a commit). Keep the
    // tail on the cursor and adopt a direction once we've travelled far enough
    // for it to be stable against jitter.
    writePoint(stroke, tailIdx, px, py, pr)
    const dx = px - ax
    const dy = py - ay
    const len = Math.hypot(dx, dy)
    if (len >= minDirectionDistance) {
      state.sleeveDir = [dx / len, dy / len]
    }
    expandBoundsToPoint(ctx, strokeId, stroke, point)
    return
  }

  // `dir` is a unit vector along the sleeve. Decompose the live sample's offset
  // from the anchor into:
  //   perpendicular — distance off the sleeve line (2D cross product magnitude),
  //   along         — signed distance projected onto the sleeve direction (dot).
  const ux = px - ax
  const uy = py - ay
  const perpendicular = Math.abs(ux * dir[1] - uy * dir[0])
  const along = ux * dir[0] + uy * dir[1]

  // How far along the sleeve the current (provisional) tail sits. A fold-back
  // retraces the sleeve line, so it stays inside the perpendicular corridor and
  // the sleeve alone can't see it — but the cursor's `along` projection starts
  // shrinking past the tail. Detecting that reversal lets us pin the apex.
  const tx = stroke.points[tailIdx * 2]
  const ty = stroke.points[tailIdx * 2 + 1]
  const tailAlong = (tx - ax) * dir[0] + (ty - ay) * dir[1]

  if (perpendicular >= tolerance || tailAlong - along >= tolerance) {
    // Either the cursor left the corridor (a genuine bend) or it reversed back
    // along the sleeve past the tail (a fold). In both cases the current tail is
    // a real vertex — the apex of the fold in the reversal case. Freeze it by
    // appending a fresh tail at the new sample; the frozen tail becomes the new
    // anchor, so clear the direction to re-establish it from there.
    writePoint(stroke, count, px, py, pr)
    stroke.pointCount = count + 1
    state.sleeveDir = [0, 0]
  } else {
    // Still within the corridor and still advancing: slide the tail to the cursor.
    writePoint(stroke, tailIdx, px, py, pr)
  }

  expandBoundsToPoint(ctx, strokeId, stroke, point)
}

/**
 * Write a point + pressure into the stroke buffers at the given point index.
 */
function writePoint(
  stroke: ReturnType<typeof PenStroke.write>,
  index: number,
  x: number,
  y: number,
  pressure: number,
): void {
  stroke.points[index * 2] = x
  stroke.points[index * 2 + 1] = y
  stroke.pressures[index] = pressure
}

/**
 * Expand the stroke's Aabb (and the dependent Block bounds + original bounds used
 * for affine transforms) to include `point`, if it falls outside the current box.
 */
function expandBoundsToPoint(
  ctx: Context,
  strokeId: EntityId,
  stroke: ReturnType<typeof PenStroke.write>,
  point: [number, number],
): void {
  if (Aabb.containsPoint(ctx, strokeId, point)) return

  Aabb.expandByPoint(ctx, strokeId, point)

  // Update block to match the expanded Aabb
  const { value: aabb } = Aabb.read(ctx, strokeId)
  const worldLeft = AabbNs.left(aabb)
  const worldTop = AabbNs.top(aabb)
  const block = Block.write(ctx, strokeId)
  Vec2.set(block.size, AabbNs.width(aabb), AabbNs.height(aabb))
  Block.setWorldPosition(ctx, strokeId, [worldLeft, worldTop])

  // Update original bounds for affine transform calculations.
  // These must be world-space since stroke.points are world-space.
  stroke.originalLeft = worldLeft
  stroke.originalTop = worldTop
  stroke.originalWidth = block.size[0]
  stroke.originalHeight = block.size[1]
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
 * For a `Stroke` (ink ribbon) we lay capsules along the path. For a `Fill` we
 * store the outline as a closed even-odd polygon so the hit region matches the
 * rendered fill (including spiral-style holes).
 *
 * The stroke points are already economical thanks to live simplification while
 * drawing, so they are used directly — no extra RDP pass. The only reduction is
 * a uniform stride subsample, applied solely as a safety net when an unusually
 * detailed stroke would overflow the fixed capsule/polygon capacities.
 */
function generateHitGeometry(ctx: Context, strokeId: EntityId): void {
  const stroke = PenStroke.read(ctx, strokeId)

  // Build array of points from the (already simplified) stroke buffer.
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < stroke.pointCount; i++) {
    points.push({
      x: stroke.points[i * 2],
      y: stroke.points[i * 2 + 1],
    })
  }

  // Add HitGeometry component if not present
  if (!hasComponent(ctx, strokeId, HitGeometry)) {
    addComponent(ctx, strokeId, HitGeometry, {})
  } else {
    HitGeometry.clear(ctx, strokeId)
  }

  // UV conversion uses ORIGINAL bounds: stroke.points are stored in original
  // world coordinates, so we must use originalLeft/Top/Width/Height (not current
  // Block bounds) for correct UVs.
  const { originalLeft, originalTop, originalWidth, originalHeight } = stroke
  const toUv = (p: { x: number; y: number }): [number, number] => [
    (p.x - originalLeft) / originalWidth,
    (p.y - originalTop) / originalHeight,
  ]

  // Fill: store a closed even-odd polygon matching the rendered fill region.
  if (stroke.kind === PenStrokeKind.Fill) {
    const polygonPoints = subsampleToCapacity(points, MAX_HIT_POLYGON_POINTS)

    // A polygon needs at least 3 vertices to enclose area. If the fill is too
    // small/degenerate, fall through to capsule geometry so it stays selectable.
    if (polygonPoints.length >= 3) {
      HitGeometry.setPolygonUv(ctx, strokeId, polygonPoints.map(toUv))
      return
    }
  }

  // Stroke (default): capsules between consecutive points. N points -> N-1
  // capsules, so cap the point count at MAX_HIT_CAPSULES + 1.
  const capsulePoints = subsampleToCapacity(points, MAX_HIT_CAPSULES + 1)

  // Ensure we have at least 2 points for a capsule
  if (capsulePoints.length === 1) {
    const pt = capsulePoints[0]
    capsulePoints.push({ x: pt.x, y: pt.y })
  }

  for (let i = 0; i < capsulePoints.length - 1; i++) {
    const p0 = capsulePoints[i]
    const p1 = capsulePoints[i + 1]

    HitGeometry.addCapsuleUv(ctx, strokeId, toUv(p0), toUv(p1), stroke.thickness)
  }
}

/**
 * Uniformly subsample `points` down to exactly `max` entries, always keeping the
 * first and last. Returns the input unchanged when it already fits. This is a
 * cheap safety net for the hit-geometry capacity limits — the drawn points are
 * already simplified, so it is a no-op for the vast majority of strokes.
 */
function subsampleToCapacity<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points

  // Evenly spaced indices across [0, length-1]; the last entry is the endpoint.
  const stride = (points.length - 1) / (max - 1)
  const result: T[] = []
  for (let i = 0; i < max - 1; i++) {
    result.push(points[Math.round(i * stride)])
  }
  result.push(points[points.length - 1])
  return result
}
