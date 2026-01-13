import { field, type Context, type EntityId } from "@infinitecanvas/ecs";
import { EditorComponentDef } from "../EditorComponentDef";
import { Vec2, Aabb, Arc, Capsule, Mat2 } from "@infinitecanvas/math";
import { Block } from "./Block";

// Pre-allocated matrix for UV-to-world transforms (avoids allocation in hot paths)
const _uvToWorldMatrix: Mat2 = [1, 0, 0, 1, 0, 0];

/**
 * Maximum number of capsules that can be stored in the hitCapsules array.
 * Each capsule takes 5 floats: ax, ay, bx, by, radius
 */
export const MAX_HIT_CAPSULES = 32;

/**
 * Number of floats per capsule in the hitCapsules array.
 */
export const FLOATS_PER_CAPSULE = 5;

/**
 * Maximum number of arcs that can be stored in the hitArcs array.
 * Each arc takes 7 floats: ax, ay, bx, by, cx, cy, thickness
 */
export const MAX_HIT_ARCS = 2;

/**
 * Number of floats per arc in the hitArcs array.
 */
export const FLOATS_PER_ARC = 7;

const HitGeometrySchema = {
  hitCapsules: field
    .buffer(field.float32())
    .size(MAX_HIT_CAPSULES * FLOATS_PER_CAPSULE),
  capsuleCount: field.uint16().default(0),
  hitArcs: field.buffer(field.float32()).size(MAX_HIT_ARCS * FLOATS_PER_ARC),
  arcCount: field.uint16().default(0),
};

/**
 * HitGeometry component - stores collision geometry for an entity in UV coordinates.
 *
 * Geometry positions are stored in UV coordinates (0-1) relative to the entity's Block.
 * UV (0,0) is top-left, (1,1) is bottom-right of the block. This means:
 * - Translating or scaling the block does NOT require updating hit geometry
 * - Rotating the block automatically rotates the hit geometry
 * - Thickness/radius values are in world units (not UV) for visual consistency
 *
 * The hitCapsules buffer stores capsule data as a flat array of floats:
 * [ax0, ay0, bx0, by0, r0, ax1, ay1, bx1, by1, r1, ...]
 *
 * Each capsule is defined by:
 * - ax, ay: First endpoint in UV coordinates (0-1)
 * - bx, by: Second endpoint in UV coordinates (0-1)
 * - radius: The radius in world units
 *
 * Uses field.buffer for zero-allocation subarray views.
 * Used for collision detection with eraser strokes and other tools.
 */
class HitGeometryDef extends EditorComponentDef<typeof HitGeometrySchema> {
  constructor() {
    super("hitHeometry", HitGeometrySchema, { sync: "document" });
  }

  /**
   * Get a capsule at a specific index from the hitCapsules buffer.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param index - Index of the capsule (0-based)
   * @returns Capsule tuple [ax, ay, bx, by, radius]
   */
  getCapsuleAt(ctx: Context, entityId: EntityId, index: number): Capsule {
    const hitGeometry = this.read(ctx, entityId);
    const offset = index * FLOATS_PER_CAPSULE;
    return [
      hitGeometry.hitCapsules[offset],
      hitGeometry.hitCapsules[offset + 1],
      hitGeometry.hitCapsules[offset + 2],
      hitGeometry.hitCapsules[offset + 3],
      hitGeometry.hitCapsules[offset + 4],
    ];
  }

  /**
   * Set a capsule at a specific index in the hitCapsules buffer.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param index - Index of the capsule (0-based)
   * @param capsule - Capsule tuple [ax, ay, bx, by, radius]
   */
  setCapsuleAt(
    ctx: Context,
    entityId: EntityId,
    index: number,
    capsule: Capsule
  ): void {
    const hitGeometry = this.write(ctx, entityId);
    const offset = index * FLOATS_PER_CAPSULE;
    for (let i = 0; i < FLOATS_PER_CAPSULE; i++) {
      hitGeometry.hitCapsules[offset + i] = capsule[i];
    }
  }

  /**
   * Get an arc at a specific index from the hitArcs buffer.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param index - Index of the arc (0-based)
   * @returns Arc tuple [ax, ay, bx, by, cx, cy, thickness]
   */
  getArcAt(ctx: Context, entityId: EntityId, index: number): Arc {
    const hitGeometry = this.read(ctx, entityId);
    const offset = index * FLOATS_PER_ARC;
    return [
      hitGeometry.hitArcs[offset],
      hitGeometry.hitArcs[offset + 1],
      hitGeometry.hitArcs[offset + 2],
      hitGeometry.hitArcs[offset + 3],
      hitGeometry.hitArcs[offset + 4],
      hitGeometry.hitArcs[offset + 5],
      hitGeometry.hitArcs[offset + 6],
    ];
  }

  /**
   * Set an arc at a specific index in the hitArcs buffer.
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param index - Index of the arc (0-based)
   * @param arc - Arc tuple [ax, ay, bx, by, cx, cy, thickness]
   */
  setArcAt(ctx: Context, entityId: EntityId, index: number, arc: Arc): void {
    const hitGeometry = this.write(ctx, entityId);
    const offset = index * FLOATS_PER_ARC;
    for (let i = 0; i < FLOATS_PER_ARC; i++) {
      hitGeometry.hitArcs[offset + i] = arc[i];
    }
  }

  /**
   * Check if a point is inside the entity's hit geometry.
   * Hit geometry is stored in UV coordinates (0-1) relative to the block.
   * This method transforms UV geometry to world space for intersection testing.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param point - Point to test in world coordinates [x, y]
   * @returns True if the point is inside any of the entity's hit capsules or arc
   */
  containsPointWorld(ctx: Context, entityId: EntityId, point: Vec2): boolean {
    const hitGeometry = this.read(ctx, entityId);

    // Build UV-to-world matrix once (computes sin/cos once)
    Block.getUvToWorldMatrix(ctx, entityId, _uvToWorldMatrix);

    // Check arc intersections (transform UV arcs to world)
    for (let i = 0; i < hitGeometry.arcCount; i++) {
      const uvArc = this.getArcAt(ctx, entityId, i);

      // Transform 3 UV points to world using matrix
      const worldA: Vec2 = [uvArc[0], uvArc[1]];
      Mat2.transformPoint(_uvToWorldMatrix, worldA);
      const worldB: Vec2 = [uvArc[2], uvArc[3]];
      Mat2.transformPoint(_uvToWorldMatrix, worldB);
      const worldC: Vec2 = [uvArc[4], uvArc[5]];
      Mat2.transformPoint(_uvToWorldMatrix, worldC);

      const thickness = uvArc[6]; // Already in world units

      const worldArc = Arc.create(
        worldA[0],
        worldA[1],
        worldB[0],
        worldB[1],
        worldC[0],
        worldC[1],
        thickness
      );

      if (Arc.containsPoint(worldArc, point)) {
        return true;
      }
    }

    // Check capsule intersections (transform UV capsules to world)
    for (let i = 0; i < hitGeometry.capsuleCount; i++) {
      const uvCapsule = this.getCapsuleAt(ctx, entityId, i);

      // Transform 2 UV points to world using matrix
      const worldA: Vec2 = [uvCapsule[0], uvCapsule[1]];
      Mat2.transformPoint(_uvToWorldMatrix, worldA);
      const worldB: Vec2 = [uvCapsule[2], uvCapsule[3]];
      Mat2.transformPoint(_uvToWorldMatrix, worldB);

      const radius = uvCapsule[4]; // Already in world units

      const worldCapsule = Capsule.create(
        worldA[0],
        worldA[1],
        worldB[0],
        worldB[1],
        radius
      );

      if (Capsule.containsPoint(worldCapsule, point)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an AABB intersects with the entity's hit geometry.
   * Hit geometry is stored in UV coordinates (0-1) relative to the block.
   * This method transforms UV geometry to world space for intersection testing.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param aabb - AABB to test in world coordinates [left, top, right, bottom]
   * @returns True if the AABB intersects any of the entity's hit capsules or arc
   */
  intersectsAabbWorld(ctx: Context, entityId: EntityId, aabb: Aabb): boolean {
    const hitGeometry = this.read(ctx, entityId);

    // Build UV-to-world matrix once (computes sin/cos once)
    Block.getUvToWorldMatrix(ctx, entityId, _uvToWorldMatrix);

    // Check arc intersections (transform UV arcs to world)
    for (let i = 0; i < hitGeometry.arcCount; i++) {
      const uvArc = this.getArcAt(ctx, entityId, i);

      // Transform 3 UV points to world using matrix
      const worldA: Vec2 = [uvArc[0], uvArc[1]];
      Mat2.transformPoint(_uvToWorldMatrix, worldA);
      const worldB: Vec2 = [uvArc[2], uvArc[3]];
      Mat2.transformPoint(_uvToWorldMatrix, worldB);
      const worldC: Vec2 = [uvArc[4], uvArc[5]];
      Mat2.transformPoint(_uvToWorldMatrix, worldC);

      const thickness = uvArc[6]; // Already in world units

      const worldArc = Arc.create(
        worldA[0],
        worldA[1],
        worldB[0],
        worldB[1],
        worldC[0],
        worldC[1],
        thickness
      );

      if (Arc.intersectsAabb(worldArc, aabb)) {
        return true;
      }
    }

    // Check capsule intersections (transform UV capsules to world)
    for (let i = 0; i < hitGeometry.capsuleCount; i++) {
      const uvCapsule = this.getCapsuleAt(ctx, entityId, i);

      // Transform 2 UV points to world using matrix
      const worldA: Vec2 = [uvCapsule[0], uvCapsule[1]];
      Mat2.transformPoint(_uvToWorldMatrix, worldA);
      const worldB: Vec2 = [uvCapsule[2], uvCapsule[3]];
      Mat2.transformPoint(_uvToWorldMatrix, worldB);

      const radius = uvCapsule[4]; // Already in world units

      const worldCapsule = Capsule.create(
        worldA[0],
        worldA[1],
        worldB[0],
        worldB[1],
        radius
      );

      if (Capsule.intersectsAabb(worldCapsule, aabb)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all extrema points of the hit geometry in world coordinates for AABB computation.
   * Hit geometry is stored in UV coordinates; this transforms them to world space.
   * Returns corner points expanded by radius/thickness for each capsule and arc.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @returns Array of extrema points in world coordinates
   */
  getExtremaWorld(ctx: Context, entityId: EntityId): Vec2[] {
    const hitGeometry = this.read(ctx, entityId);
    const pts: Vec2[] = [];

    // Build UV-to-world matrix once (computes sin/cos once)
    Block.getUvToWorldMatrix(ctx, entityId, _uvToWorldMatrix);

    // Add extrema from capsules (transform UV to world, then compute extrema)
    for (let i = 0; i < hitGeometry.capsuleCount; i++) {
      const uvCapsule = this.getCapsuleAt(ctx, entityId, i);

      // Transform 2 UV points to world using matrix
      const worldA: Vec2 = [uvCapsule[0], uvCapsule[1]];
      Mat2.transformPoint(_uvToWorldMatrix, worldA);
      const worldB: Vec2 = [uvCapsule[2], uvCapsule[3]];
      Mat2.transformPoint(_uvToWorldMatrix, worldB);

      const radius = uvCapsule[4]; // Already in world units

      const worldCapsule = Capsule.create(
        worldA[0],
        worldA[1],
        worldB[0],
        worldB[1],
        radius
      );
      pts.push(...Capsule.getExtrema(worldCapsule));
    }

    // Add extrema from arcs (transform UV to world, then compute extrema)
    for (let i = 0; i < hitGeometry.arcCount; i++) {
      const uvArc = this.getArcAt(ctx, entityId, i);

      // Transform 3 UV points to world using matrix
      const worldA: Vec2 = [uvArc[0], uvArc[1]];
      Mat2.transformPoint(_uvToWorldMatrix, worldA);
      const worldB: Vec2 = [uvArc[2], uvArc[3]];
      Mat2.transformPoint(_uvToWorldMatrix, worldB);
      const worldC: Vec2 = [uvArc[4], uvArc[5]];
      Mat2.transformPoint(_uvToWorldMatrix, worldC);

      const thickness = uvArc[6]; // Already in world units

      const worldArc = Arc.create(
        worldA[0],
        worldA[1],
        worldB[0],
        worldB[1],
        worldC[0],
        worldC[1],
        thickness
      );
      pts.push(...Arc.getExtrema(worldArc));
    }

    return pts;
  }

  // ============================================
  // User-facing helper methods for adding hit geometry
  // ============================================

  /**
   * Add a capsule from a capsule tuple [ax, ay, bx, by, radius].
   * Positions are in UV coordinates (0-1), radius is in world units.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param capsule - Capsule tuple [ax, ay, bx, by, radius]
   */
  addCapsule(ctx: Context, entityId: EntityId, capsule: Capsule): void {
    const hitGeometry = this.write(ctx, entityId);
    const index = hitGeometry.capsuleCount;

    if (index >= MAX_HIT_CAPSULES) {
      console.warn(`HitGeometry: Max capsules (${MAX_HIT_CAPSULES}) reached`);
      return;
    }

    this.setCapsuleAt(ctx, entityId, index, capsule);
    hitGeometry.capsuleCount = index + 1;
  }

  /**
   * Add a capsule using UV coordinates.
   * UV (0,0) is top-left, (1,1) is bottom-right of the block.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param uvA - First endpoint in UV coordinates [0-1, 0-1]
   * @param uvB - Second endpoint in UV coordinates [0-1, 0-1]
   * @param worldRadius - Radius in world units (pixels)
   */
  addCapsuleUv(
    ctx: Context,
    entityId: EntityId,
    uvA: Vec2,
    uvB: Vec2,
    worldRadius: number
  ): void {
    const capsule: Capsule = [uvA[0], uvA[1], uvB[0], uvB[1], worldRadius];
    this.addCapsule(ctx, entityId, capsule);
  }

  /**
   * Add a capsule using world coordinates.
   * Automatically converts to UV coordinates relative to the block.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param worldA - First endpoint in world coordinates
   * @param worldB - Second endpoint in world coordinates
   * @param worldRadius - Radius in world units (pixels)
   */
  addCapsuleWorld(
    ctx: Context,
    entityId: EntityId,
    worldA: Vec2,
    worldB: Vec2,
    worldRadius: number
  ): void {
    const uvA = Block.worldToUv(ctx, entityId, worldA);
    const uvB = Block.worldToUv(ctx, entityId, worldB);
    this.addCapsuleUv(ctx, entityId, uvA, uvB, worldRadius);
  }

  /**
   * Add an arc from an arc tuple [aX, aY, bX, bY, cX, cY, thickness].
   * Positions are in UV coordinates (0-1), thickness is in world units.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param arc - Arc tuple [aX, aY, bX, bY, cX, cY, thickness]
   */
  addArc(ctx: Context, entityId: EntityId, arc: Arc): void {
    const hitGeometry = this.write(ctx, entityId);
    const index = hitGeometry.arcCount;

    if (index >= MAX_HIT_ARCS) {
      console.warn(`HitGeometry: Max arcs (${MAX_HIT_ARCS}) reached`);
      return;
    }

    this.setArcAt(ctx, entityId, index, arc);
    hitGeometry.arcCount = index + 1;
  }

  /**
   * Add an arc using UV coordinates.
   * UV (0,0) is top-left, (1,1) is bottom-right of the block.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param uvA - Start point in UV coordinates
   * @param uvB - Control point in UV coordinates
   * @param uvC - End point in UV coordinates
   * @param worldThickness - Thickness in world units (pixels)
   */
  addArcUv(
    ctx: Context,
    entityId: EntityId,
    uvA: Vec2,
    uvB: Vec2,
    uvC: Vec2,
    worldThickness: number
  ): void {
    const arc: Arc = [
      uvA[0],
      uvA[1],
      uvB[0],
      uvB[1],
      uvC[0],
      uvC[1],
      worldThickness,
    ];
    this.addArc(ctx, entityId, arc);
  }

  /**
   * Add an arc using world coordinates.
   * Automatically converts to UV coordinates relative to the block.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param worldA - Start point in world coordinates
   * @param worldB - Control point in world coordinates
   * @param worldC - End point in world coordinates
   * @param worldThickness - Thickness in world units (pixels)
   */
  addArcWorld(
    ctx: Context,
    entityId: EntityId,
    worldA: Vec2,
    worldB: Vec2,
    worldC: Vec2,
    worldThickness: number
  ): void {
    const uvA = Block.worldToUv(ctx, entityId, worldA);
    const uvB = Block.worldToUv(ctx, entityId, worldB);
    const uvC = Block.worldToUv(ctx, entityId, worldC);
    this.addArcUv(ctx, entityId, uvA, uvB, uvC, worldThickness);
  }

  /**
   * Clear all hit geometry from an entity.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   */
  clear(ctx: Context, entityId: EntityId): void {
    const hitGeometry = this.write(ctx, entityId);
    hitGeometry.capsuleCount = 0;
    hitGeometry.arcCount = 0;
  }
}

export const HitGeometry = new HitGeometryDef();
