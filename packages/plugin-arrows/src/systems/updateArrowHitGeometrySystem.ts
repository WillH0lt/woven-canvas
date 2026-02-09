import {
  defineEditorSystem,
  defineQuery,
  hasComponent,
  addComponent,
  Block,
  Connector,
  HitGeometry,
  MAX_HIT_CAPSULES,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Arc, Capsule, Scalar, type Vec2 } from "@infinitecanvas/math";

import { ArcArrow, ElbowArrow } from "../components";
import { closestPointToPoint } from "../helpers";

const MIN_HIT_THICKNESS = 20;

// Query for arrows that need hit geometry updates
const arcArrowsQuery = defineQuery((q) => q.tracking(ArcArrow, Connector));
const elbowArrowsQuery = defineQuery((q) => q.tracking(ElbowArrow, Connector));

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
  },
);

/**
 * Update hit geometry for an arc arrow.
 * Writes UV coordinates directly to HitGeometry (positions in UV, thickness in world units).
 */
function updateArcArrowHitGeometry(ctx: Context, entityId: EntityId): void {
  // Ensure HitGeometry component exists
  if (!hasComponent(ctx, entityId, HitGeometry)) {
    addComponent(ctx, entityId, HitGeometry, {});
  }

  // Copy arc directly from ArcArrow to HitGeometry (both use same UV format)
  const arcArrow = ArcArrow.read(ctx, entityId);
  const arc = Arc.clone(arcArrow.value);
  // Ensure minimum hit thickness for easier selection
  arc[6] = Math.max(arc[6], MIN_HIT_THICKNESS);

  HitGeometry.clear(ctx, entityId);
  HitGeometry.addArc(ctx, entityId, arc);

  // Update trim based on connected blocks
  updateArcArrowTrim(ctx, entityId);
}

/**
 * Update hit geometry for an elbow arrow.
 * Writes UV coordinates directly to HitGeometry (positions in UV, radius in world units).
 */
function updateElbowArrowHitGeometry(ctx: Context, entityId: EntityId): void {
  // Ensure HitGeometry component exists
  if (!hasComponent(ctx, entityId, HitGeometry)) {
    addComponent(ctx, entityId, HitGeometry, {});
  }

  const arrow = ElbowArrow.read(ctx, entityId);
  // Ensure minimum hit thickness for easier selection
  const thickness = Math.max(arrow.thickness, MIN_HIT_THICKNESS);
  // Get UV points directly (no world transform)
  const uvPoints = ElbowArrow.getPoints(ctx, entityId);

  // Create a capsule for each line segment using UV coordinates
  const hitGeometry = HitGeometry.write(ctx, entityId);

  const segmentCount = Math.min(uvPoints.length - 1, MAX_HIT_CAPSULES);
  hitGeometry.capsuleCount = segmentCount;
  hitGeometry.arcCount = 0;

  for (let i = 0; i < segmentCount; i++) {
    const p0 = uvPoints[i];
    const p1 = uvPoints[i + 1];

    // Positions in UV, radius in world units
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
  const worldArc = ArcArrow.getWorldArc(ctx, entityId);
  const { a, c } = ArcArrow.getWorldPoints(ctx, entityId);

  // Calculate trim values using arc-block intersection
  let startTrim = calculateArcTrim(ctx, connector.startBlock, worldArc, a);
  let endTrim = calculateArcTrim(ctx, connector.endBlock, worldArc, c);

  // Reset if visible portion is too small
  if (1 - endTrim - startTrim < 0.1) {
    startTrim = 0;
    endTrim = 0;
  }

  // Only update if trim values have changed significantly to avoid update loops
  const arcArrowRead = ArcArrow.read(ctx, entityId);
  if (
    !Scalar.approxEqual(arcArrowRead.trimStart, startTrim) ||
    !Scalar.approxEqual(arcArrowRead.trimEnd, endTrim)
  ) {
    const arcArrow = ArcArrow.write(ctx, entityId);
    arcArrow.trimStart = startTrim;
    arcArrow.trimEnd = endTrim;
  }

  // Trim the hit arc geometry
  const hitGeometry = HitGeometry.read(ctx, entityId);
  for (let i = 0; i < hitGeometry.arcCount; i++) {
    const arc = HitGeometry.getArcAt(ctx, entityId, i);
    Arc.trim(arc, startTrim, 1 - endTrim);
    HitGeometry.setArcAt(ctx, entityId, i, arc);
  }
}

/**
 * Calculate trim value where an arc intersects a block.
 * Uses arc-circle intersection with block edges (not straight-line intersection).
 */
function calculateArcTrim(
  ctx: Context,
  blockId: EntityId | null,
  arc: Arc,
  referencePoint: Vec2,
): number {
  if (!blockId) return 0;

  // Get block corners for intersection testing
  const corners = Block.getCorners(ctx, blockId);

  // Find arc-block intersections (arc-circle intersection with each edge)
  const intersections = Arc.intersectRect(arc, corners);

  if (intersections.length === 0) return 0;

  // Find closest intersection to the reference point
  const closest = closestPointToPoint(intersections, referencePoint);

  if (!closest) return 0;

  // Convert intersection point to parametric value on the arc
  const t = Arc.pointToParametric(arc, closest);

  return t ?? 0;
}

/**
 * Update trim values for elbow arrow based on connected blocks.
 */
function updateElbowArrowTrim(ctx: Context, entityId: EntityId): void {
  const connector = Connector.read(ctx, entityId);
  const points = ElbowArrow.getWorldPoints(ctx, entityId);
  const segmentCount = points.length - 1;

  if (segmentCount < 1) return;

  // Calculate trim for first and last segments using refs directly
  const start = points[0];
  const end = points[points.length - 1];
  const firstSegmentEnd = points[1];
  const lastSegmentStart = points[points.length - 2];

  const startTrim = calculateLineTrim(
    ctx,
    connector.startBlock,
    start,
    firstSegmentEnd,
  );
  const endTrim = calculateLineTrim(
    ctx,
    connector.endBlock,
    end,
    lastSegmentStart,
  );

  // Only update if trim values have changed significantly to avoid update loops
  const elbowArrowRead = ElbowArrow.read(ctx, entityId);
  if (
    !Scalar.approxEqual(elbowArrowRead.trimStart, startTrim) ||
    !Scalar.approxEqual(elbowArrowRead.trimEnd, endTrim)
  ) {
    const elbowArrow = ElbowArrow.write(ctx, entityId);
    elbowArrow.trimStart = startTrim;
    elbowArrow.trimEnd = endTrim;
  }

  // Trim the first capsule from startTrim to 1
  const startCapsule = HitGeometry.getCapsuleAt(ctx, entityId, 0);
  Capsule.trim(startCapsule, startTrim, 1);
  HitGeometry.setCapsuleAt(ctx, entityId, 0, startCapsule);

  // Trim the last capsule from 0 to (1 - endTrim)
  const lastIndex = segmentCount - 1;
  const endCapsule = HitGeometry.getCapsuleAt(ctx, entityId, lastIndex);
  Capsule.trim(endCapsule, 0, 1 - endTrim);
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
): number {
  if (!blockId) return 0;

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
      edgeEnd,
    );
    if (intersection) {
      intersections.push(intersection);
    }
  }

  if (intersections.length === 0) return 0;

  // Find closest intersection to line start
  const closest = closestPointToPoint(intersections, lineStart);

  if (!closest) return 0;

  // Calculate parametric position along line
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const length = Math.hypot(dx, dy);

  if (length < 0.001) return 0;

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
  b2: Vec2,
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
