import { type Aabb, type Mat2, Rect, Vec2 } from '@woven-canvas/math'
import { CanvasComponentDef } from '@woven-ecs/canvas-store'
import { type Context, type EntityId, field, hasComponent } from '@woven-ecs/core'

import { ResizeMode } from '../types'

// Pre-allocated arrays for SAT intersection to avoid allocations
const _aabbCorners: [Vec2, Vec2, Vec2, Vec2] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
]
const _blockCorners: [Vec2, Vec2, Vec2, Vec2] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
]
const _blockAxes: [Vec2, Vec2] = [
  [0, 0],
  [0, 0],
]

const BlockSchema = {
  /** Element tag name (e.g., "div", "img") */
  tag: field.string().max(36).default('div'),
  /** Position as [left, top] */
  position: field.tuple(field.float64(), 2).default([0, 0]),
  /** Size as [width, height] */
  size: field.tuple(field.float64(), 2).default([100, 100]),
  /** Rotation around center in radians */
  rotateZ: field.float64().default(0),
  /** Flip state as [flipX, flipY] */
  flip: field.tuple(field.boolean(), 2).default([false, false]),
  /** Z-order rank (LexoRank string) */
  rank: field.string().max(36).default(''),
  /** How the block can be resized */
  resizeMode: field.enum(ResizeMode).default(ResizeMode.Default),
  /** Parent block ID — position is relative to parent if set */
  parentId: field.ref(),
}

/**
 * Block component - core spatial data for canvas entities.
 *
 * Contains position (left, top), size (width, height), rotation (rotateZ),
 * z-order (rank), and element tag.
 */
// Pre-allocated vector for world position resolution
const _worldPos: Vec2 = [0, 0]

class BlockDef extends CanvasComponentDef<typeof BlockSchema> {
  constructor() {
    super({ name: 'block', sync: 'document' }, BlockSchema)
  }

  /**
   * Resolve world-space position by walking up the parentId chain.
   * For root blocks (no parent), returns block.position directly.
   */
  getWorldPosition(ctx: Context, entityId: EntityId, out?: Vec2): Vec2 {
    const block = this.read(ctx, entityId)
    const result: Vec2 = out ?? [0, 0]
    result[0] = block.position[0]
    result[1] = block.position[1]

    let current = block.parentId
    const visited = new Set<EntityId>()

    while (current !== null && hasComponent(ctx, current, this)) {
      if (visited.has(current)) break
      visited.add(current)
      const parent = this.read(ctx, current)
      result[0] += parent.position[0]
      result[1] += parent.position[1]
      current = parent.parentId
    }

    return result
  }

  /**
   * Set the world-space position of a block (converts to parent-local internally).
   */
  setWorldPosition(ctx: Context, entityId: EntityId, worldPos: Vec2): void {
    const block = this.write(ctx, entityId)
    const parentId = block.parentId

    if (parentId === null || !hasComponent(ctx, parentId, this)) {
      Vec2.copy(block.position, worldPos)
      return
    }

    const parentWorld = this.getWorldPosition(ctx, parentId, _worldPos)
    block.position[0] = worldPos[0] - parentWorld[0]
    block.position[1] = worldPos[1] - parentWorld[1]
  }

  /**
   * Get the center point of a block in world space.
   * @param out - Optional output vector to write to (avoids allocation)
   */
  getCenter(ctx: Context, entityId: EntityId, out?: Vec2): Vec2 {
    const { size } = this.read(ctx, entityId)
    const worldPos = this.getWorldPosition(ctx, entityId, _worldPos)
    const result: Vec2 = out ?? [0, 0]
    Rect.getCenter(worldPos, size, result)
    return result
  }

  /**
   * Set the center point of a block in world space (adjusts local position accordingly).
   */
  setCenter(ctx: Context, entityId: EntityId, center: Vec2): void {
    const block = this.write(ctx, entityId)
    // Compute the world position that corresponds to this center
    const worldPos: Vec2 = [center[0] - block.size[0] / 2, center[1] - block.size[1] / 2]
    // Convert to local
    const parentId = block.parentId
    if (parentId !== null && hasComponent(ctx, parentId, this)) {
      const parentWorld = this.getWorldPosition(ctx, parentId, _worldPos)
      block.position[0] = worldPos[0] - parentWorld[0]
      block.position[1] = worldPos[1] - parentWorld[1]
    } else {
      Vec2.copy(block.position, worldPos)
    }
  }

  /**
   * Get the four corner points of a block in world space (accounting for rotation).
   * Returns corners in order: top-left, top-right, bottom-right, bottom-left.
   * @param out - Optional output array to write to (avoids allocation)
   */
  getCorners(ctx: Context, entityId: EntityId, out?: [Vec2, Vec2, Vec2, Vec2]): [Vec2, Vec2, Vec2, Vec2] {
    const { size, rotateZ } = this.read(ctx, entityId)
    const worldPos = this.getWorldPosition(ctx, entityId, _worldPos)
    const result: [Vec2, Vec2, Vec2, Vec2] = out ?? [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]
    Rect.getCorners(worldPos, size, rotateZ, result)
    return result
  }

  /**
   * Check if a world-space point intersects a block (accounting for rotation).
   */
  containsPoint(ctx: Context, entityId: EntityId, point: Vec2): boolean {
    const { size, rotateZ } = this.read(ctx, entityId)
    const worldPos = this.getWorldPosition(ctx, entityId, _worldPos)
    return Rect.containsPoint(worldPos, size, rotateZ, point)
  }

  /**
   * Move a block by a delta offset.
   */
  translate(ctx: Context, entityId: EntityId, delta: Vec2): void {
    const block = this.write(ctx, entityId)
    Rect.translate(block.position, delta)
  }

  /**
   * Set the position of a block.
   */
  setPosition(ctx: Context, entityId: EntityId, position: Vec2): void {
    const block = this.write(ctx, entityId)
    Vec2.copy(block.position, position)
  }

  /**
   * Set the size of a block.
   */
  setSize(ctx: Context, entityId: EntityId, size: Vec2): void {
    const block = this.write(ctx, entityId)
    Vec2.copy(block.size, size)
  }

  /**
   * Rotate a block by a delta angle (in radians).
   */
  rotateBy(ctx: Context, entityId: EntityId, deltaAngle: number): void {
    const block = this.write(ctx, entityId)
    block.rotateZ += deltaAngle
  }

  /**
   * Rotate a block around a pivot point.
   */
  rotateAround(ctx: Context, entityId: EntityId, pivot: Vec2, angle: number): void {
    const block = this.write(ctx, entityId)
    block.rotateZ = Rect.rotateAround(block.position, block.size, block.rotateZ, pivot, angle)
  }

  /**
   * Scale a block uniformly around its center.
   */
  scaleBy(ctx: Context, entityId: EntityId, scaleFactor: number): void {
    const block = this.write(ctx, entityId)
    Rect.scaleBy(block.position, block.size, scaleFactor)
  }

  /**
   * Scale a block around a pivot point.
   */
  scaleAround(ctx: Context, entityId: EntityId, pivot: Vec2, scaleFactor: number): void {
    const block = this.write(ctx, entityId)
    Rect.scaleAround(block.position, block.size, pivot, scaleFactor)
  }

  /**
   * Check if an AABB intersects with this block using Separating Axis Theorem.
   * This handles all intersection cases including narrow AABBs that pass through
   * the middle of a rotated block without touching any corners.
   * Optimized to avoid allocations for hot path usage.
   */
  intersectsAabb(ctx: Context, entityId: EntityId, aabb: Aabb): boolean {
    const { size, rotateZ } = this.read(ctx, entityId)
    const worldPos = this.getWorldPosition(ctx, entityId, _worldPos)
    return Rect.intersectsAabb(worldPos, size, rotateZ, aabb, _blockCorners, _aabbCorners, _blockAxes)
  }

  worldToUv(ctx: Context, entityId: EntityId, worldPos: Vec2): Vec2 {
    const { size, rotateZ, flip } = this.read(ctx, entityId)
    const blockWorldPos = this.getWorldPosition(ctx, entityId, _worldPos)
    const uv = Rect.worldToUv(blockWorldPos, size, rotateZ, worldPos)
    // Apply flip to UV coordinates
    if (flip[0]) uv[0] = 1 - uv[0]
    if (flip[1]) uv[1] = 1 - uv[1]
    return uv
  }

  uvToWorld(ctx: Context, entityId: EntityId, uv: Vec2): Vec2 {
    const { size, rotateZ, flip } = this.read(ctx, entityId)
    const worldPos = this.getWorldPosition(ctx, entityId, _worldPos)
    // Apply flip to UV coordinates before converting to world
    const flippedUv: Vec2 = [flip[0] ? 1 - uv[0] : uv[0], flip[1] ? 1 - uv[1] : uv[1]]
    return Rect.uvToWorld(worldPos, size, rotateZ, flippedUv)
  }

  /**
   * Get the UV-to-world transformation matrix for a block.
   * More efficient than multiple uvToWorld() calls since sin/cos is computed once.
   * Use with Mat2.transformPoint() to transform UV coordinates to world.
   * Note: This matrix does NOT account for flip - use uvToWorld() for flipped blocks.
   *
   * @param ctx - ECS context
   * @param entityId - Entity ID
   * @param out - Output matrix to write to [a, b, c, d, tx, ty]
   */
  getUvToWorldMatrix(ctx: Context, entityId: EntityId, out: Mat2): void {
    const { size, rotateZ, flip } = this.read(ctx, entityId)
    const worldPos = this.getWorldPosition(ctx, entityId, _worldPos)
    Rect.getUvToWorldMatrix(worldPos, size, rotateZ, out)
    // Apply flip by negating scale and adjusting translation
    if (flip[0]) {
      out[0] = -out[0] // Negate scaleX
      out[2] = -out[2] // Negate shearX
      out[4] += size[0] * Math.cos(rotateZ) // Adjust tx
      out[5] += size[0] * Math.sin(rotateZ) // Adjust ty
    }
    if (flip[1]) {
      out[1] = -out[1] // Negate shearY
      out[3] = -out[3] // Negate scaleY
      out[4] -= size[1] * Math.sin(rotateZ) // Adjust tx
      out[5] += size[1] * Math.cos(rotateZ) // Adjust ty
    }
  }
}

export const Block = new BlockDef()
