import {
  defineEditorSystem,
  defineQuery,
  hasComponent,
  addComponent,
  Block,
  Synced,
  Connector,
  Aabb,
  HitGeometry,
  MAX_HIT_CAPSULES,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Arc, Capsule, type Vec2 } from "@infinitecanvas/math";

import { ArcArrow, ElbowArrow, ArrowTrim } from "../components";
import { closestPointToPoint } from "../helpers";

// Query for arrows that need hit geometry updates
const arcArrowsQuery = defineQuery((q) => q.tracking(ArcArrow, Block, Connector));
const elbowArrowsQuery = defineQuery((q) =>
  q.tracking(ElbowArrow, Block, Connector)
);
const blocksQuery = defineQuery((q) => q.with(Block, Synced, Aabb));

const MIN_HIT_THICKNESS = 20;

/**
 * Update arrow hit geometry system.
 *
 * Creates and updates HitGeometry components for arrows so they can
 * be selected and interact with other elements.
 */
export const updateArrowHitGeometrySystem = defineEditorSystem(
  { phase: "update", priority: -10 },
  (ctx: Context) => {
    // Update arc arrows
    for (const entityId of arcArrowsQuery.addedOrChanged(ctx)) {
      updateArcArrowHitGeometry(ctx, entityId);
    }

    // Update elbow arrows
    for (const entityId of elbowArrowsQuery.addedOrChanged(ctx)) {
      updateElbowArrowHitGeometry(ctx, entityId);
    }
  }
);

/**
 * Update hit geometry for an arc arrow.
 */
function updateArcArrowHitGeometry(ctx: Context, entityId: EntityId): void {
  // Ensure HitGeometry component exists
  if (!hasComponent(ctx, entityId, HitGeometry)) {
    addComponent(ctx, entityId, HitGeometry, {});
  }

  // Ensure ArrowTrim component exists
  if (!hasComponent(ctx, entityId, ArrowTrim)) {
    addComponent(ctx, entityId, ArrowTrim, {});
  }

  const { a, b, c } = ArcArrow.getWorldPoints(ctx, entityId);
  const thickness = Math.max(ArcArrow.getThickness(ctx, entityId), MIN_HIT_THICKNESS);

  // Use arc hit geometry for proper curved collision detection
  const hitGeometry = HitGeometry.write(ctx, entityId);
  hitGeometry.capsuleCount = 0;
  hitGeometry.hasArc = true;
  Arc.setFromPoints(hitGeometry.hitArc, a, b, c, thickness);

  // Update trim based on connected blocks
  updateArcArrowTrim(ctx, entityId);
}

/**
 * Update hit geometry for an elbow arrow.
 */
function updateElbowArrowHitGeometry(ctx: Context, entityId: EntityId): void {
  // Ensure HitGeometry component exists
  if (!hasComponent(ctx, entityId, HitGeometry)) {
    addComponent(ctx, entityId, HitGeometry, {});
  }

  // Ensure ArrowTrim component exists
  if (!hasComponent(ctx, entityId, ArrowTrim)) {
    addComponent(ctx, entityId, ArrowTrim, {});
  }

  const arrow = ElbowArrow.read(ctx, entityId);
  const points = ElbowArrow.getWorldPoints(ctx, entityId);

  const thickness = Math.max(arrow.thickness, MIN_HIT_THICKNESS);

  // Create a capsule for each line segment
  const hitGeometry = HitGeometry.write(ctx, entityId);

  const segmentCount = Math.min(points.length - 1, MAX_HIT_CAPSULES);
  hitGeometry.capsuleCount = segmentCount;

  for (let i = 0; i < segmentCount; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const capsule = Capsule.create(p0[0], p0[1], p1[0], p1[1], thickness / 2);
    HitGeometry.setCapsuleAt(ctx, entityId, i, capsule);
  }

  // Update trim based on connected blocks and apply to hit geometry
  updateElbowArrowTrim(ctx, entityId);
}

/**
 * Update trim values for arc arrow based on connected blocks.
 */
function updateArcArrowTrim(ctx: Context, entityId: EntityId): void {
  const connector = Connector.read(ctx, entityId);
  const { a, c } = ArcArrow.getWorldPoints(ctx, entityId);

  // Find connected blocks
  let startBlockId: EntityId | null = null;
  let endBlockId: EntityId | null = null;

  for (const blockId of blocksQuery.current(ctx)) {
    const synced = Synced.read(ctx, blockId);
    if (synced.id === connector.startBlockId) {
      startBlockId = blockId;
    }
    if (synced.id === connector.endBlockId) {
      endBlockId = blockId;
    }
  }

  const trim = ArrowTrim.write(ctx, entityId);

  // Calculate trim values
  const startTrim = calculateLineTrim(ctx, startBlockId, a, c, 0);
  const endTrim = calculateLineTrim(ctx, endBlockId, c, a, 1);

  trim.tStart = startTrim;
  trim.tEnd = endTrim;

  // Reset if trim is too small
  if (endTrim - startTrim < 0.1) {
    trim.tStart = 0;
    trim.tEnd = 1;
  }

  // Trim the hit arc geometry
  const hitGeometry = HitGeometry.write(ctx, entityId);
  if (hitGeometry.hasArc) {
    Arc.trim(hitGeometry.hitArc, trim.tStart, trim.tEnd);
  }
}

/**
 * Update trim values for elbow arrow based on connected blocks.
 */
function updateElbowArrowTrim(ctx: Context, entityId: EntityId): void {
  const connector = Connector.read(ctx, entityId);
  const points = ElbowArrow.getWorldPoints(ctx, entityId);
  const segmentCount = points.length - 1;

  if (segmentCount < 1) return;

  // Find connected blocks
  let startBlockId: EntityId | null = null;
  let endBlockId: EntityId | null = null;

  for (const blockId of blocksQuery.current(ctx)) {
    const synced = Synced.read(ctx, blockId);
    if (synced.id === connector.startBlockId) {
      startBlockId = blockId;
    }
    if (synced.id === connector.endBlockId) {
      endBlockId = blockId;
    }
  }

  const trim = ArrowTrim.write(ctx, entityId);

  // Calculate trim for first and last segments
  const start = points[0];
  const end = points[points.length - 1];
  const firstSegmentEnd = points[1];
  const lastSegmentStart = points[points.length - 2];

  const startTrim = calculateLineTrim(ctx, startBlockId, start, firstSegmentEnd, 0);
  const endTrim = calculateLineTrim(ctx, endBlockId, end, lastSegmentStart, 1);

  trim.tStart = startTrim;
  trim.tEnd = endTrim;

  // Trim the first capsule from startTrim to 1
  const startCapsule = HitGeometry.getCapsuleAt(ctx, entityId, 0);
  Capsule.trim(startCapsule, startTrim, 1);
  HitGeometry.setCapsuleAt(ctx, entityId, 0, startCapsule);

  // Trim the last capsule from 0 to endTrim
  const lastIndex = segmentCount - 1;
  const endCapsule = HitGeometry.getCapsuleAt(ctx, entityId, lastIndex);
  Capsule.trim(endCapsule, 0, endTrim);
  HitGeometry.setCapsuleAt(ctx, entityId, lastIndex, endCapsule);
}

/**
 * Calculate trim value where a line segment intersects a block.
 */
function calculateLineTrim(
  ctx: Context,
  blockId: EntityId | null,
  lineStart: Vec2,
  lineEnd: Vec2,
  defaultValue: number
): number {
  if (!blockId) return defaultValue;

  const corners = Block.getCorners(ctx, blockId);

  // Find line-block intersections
  const intersections: Vec2[] = [];
  for (let i = 0; i < 4; i++) {
    const edgeStart = corners[i];
    const edgeEnd = corners[(i + 1) % 4];

    const intersection = lineSegmentIntersection(
      lineStart,
      lineEnd,
      edgeStart,
      edgeEnd
    );
    if (intersection) {
      intersections.push(intersection);
    }
  }

  if (intersections.length === 0) return defaultValue;

  // Find closest intersection to reference point
  const referencePoint = defaultValue === 0 ? lineStart : lineEnd;
  const closest = closestPointToPoint(intersections, referencePoint);

  if (!closest) return defaultValue;

  // Calculate parametric position along line
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const length = Math.hypot(dx, dy);

  if (length < 0.001) return defaultValue;

  const t =
    ((closest[0] - lineStart[0]) * dx + (closest[1] - lineStart[1]) * dy) /
    (length * length);

  return Math.max(0, Math.min(1, t));
}

/**
 * Calculate intersection point of two line segments.
 */
function lineSegmentIntersection(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2
): Vec2 | null {
  const dx1 = a2[0] - a1[0];
  const dy1 = a2[1] - a1[1];
  const dx2 = b2[0] - b1[0];
  const dy2 = b2[1] - b1[1];

  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < 1e-10) return null;

  const dx = b1[0] - a1[0];
  const dy = b1[1] - a1[1];

  const t = (dx * dy2 - dy * dx2) / det;
  const u = (dx * dy1 - dy * dx1) / det;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [a1[0] + t * dx1, a1[1] + t * dy1];
  }

  return null;
}
