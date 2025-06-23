import type { AabbModel } from '@infinitecanvas/core'
import { Aabb, Block } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'

export function intersectAabb(aabb: AabbModel, blockEntities: readonly Entity[]): Entity[] {
  const intersecting: Entity[] = []

  for (const blockEntity of blockEntities) {
    const entityAabb = blockEntity.read(Aabb)

    // Quick AABB intersection check first
    if (!intersectsAabbWithAabb(aabb, entityAabb)) {
      continue
    }

    // Now check if the AABB actually intersects with the oriented block
    const block = blockEntity.read(Block)
    if (aabbIntersectsBlock(aabb, block)) {
      intersecting.push(blockEntity)
    }
  }

  return intersecting
}

function intersectsAabbWithAabb(aabb1: AabbModel, aabb2: Aabb): boolean {
  return !(aabb1.right < aabb2.left || aabb1.left > aabb2.right || aabb1.bottom < aabb2.top || aabb1.top > aabb2.bottom)
}

function aabbIntersectsBlock(aabb: AabbModel, block: Block): boolean {
  // Use Separating Axis Theorem (SAT) between AABB and oriented rectangle

  // Get corners of the AABB
  const aabbCorners: [number, number][] = [
    [aabb.left, aabb.top],
    [aabb.right, aabb.top],
    [aabb.right, aabb.bottom],
    [aabb.left, aabb.bottom],
  ]

  // Get corners of the oriented block
  const blockCorners = getBlockCorners(block)

  // Test axes from AABB (just X and Y axes since AABB is axis-aligned)
  const aabbAxes: [number, number][] = [
    [1, 0],
    [0, 1],
  ]

  // Test axes from block (normals of its edges)
  const blockAxes: [number, number][] = []
  for (let i = 0; i < 4; i++) {
    const edge = [blockCorners[(i + 1) % 4][0] - blockCorners[i][0], blockCorners[(i + 1) % 4][1] - blockCorners[i][1]]
    // Get perpendicular (normal) and normalize
    const length = Math.sqrt(edge[1] * edge[1] + edge[0] * edge[0])
    if (length > 0) {
      blockAxes.push([-edge[1] / length, edge[0] / length])
    }
  }

  // Test all axes
  const allAxes = [...aabbAxes, ...blockAxes]

  for (const axis of allAxes) {
    // Project AABB onto axis
    const aabbProjection = projectRectangleOntoAxis(aabbCorners, axis)

    // Project block onto axis
    const blockProjection = projectRectangleOntoAxis(blockCorners, axis)

    // Check for separation
    if (aabbProjection.max < blockProjection.min || blockProjection.max < aabbProjection.min) {
      return false // Separating axis found
    }
  }

  return true // No separating axis found, shapes intersect
}

function getBlockCorners(block: Block): [number, number][] {
  const { width, height, left, top, rotateZ } = block
  const cx = left + width / 2
  const cy = top + height / 2

  const halfWidth = width / 2
  const halfHeight = height / 2

  // Local corners (before rotation)
  const corners: [number, number][] = [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ]

  // Rotate and translate corners
  const cos = Math.cos(rotateZ)
  const sin = Math.sin(rotateZ)

  return corners.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos])
}

function projectRectangleOntoAxis(corners: [number, number][], axis: [number, number]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const corner of corners) {
    const projection = corner[0] * axis[0] + corner[1] * axis[1]
    min = Math.min(min, projection)
    max = Math.max(max, projection)
  }

  return { min, max }
}
