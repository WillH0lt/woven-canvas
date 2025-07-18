import type { Entity } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'
import { Aabb, Block } from '../components'

function intersectsBlock(point: [number, number], block: Block): boolean {
  const { width, height, left, top, rotateZ } = block

  // Translate point to block's local coordinate system
  const cx = left + width / 2
  const cy = top + height / 2

  const dx = point[0] - cx
  const dy = point[1] - cy

  // Rotate point in opposite direction of block's rotation
  const rad = -rotateZ
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos

  // Check if point is within unrotated block bounds
  return localX >= -width / 2 && localX <= width / 2 && localY >= -height / 2 && localY <= height / 2
}

function intersectsAabb(point: [number, number], aabb: Aabb): boolean {
  return point[0] >= aabb.left && point[0] <= aabb.right && point[1] >= aabb.top && point[1] <= aabb.bottom
}

export function intersectPoint(point: [number, number], blockEntities: readonly Entity[]): Entity | undefined {
  let intersect: Entity | undefined = undefined
  let maxRank: LexoRank = LexoRank.min()

  for (const blockEntity of blockEntities) {
    const aabb = blockEntity.read(Aabb)

    if (!intersectsAabb(point, aabb)) {
      continue
    }

    const block = blockEntity.read(Block)
    if (!intersectsBlock(point, block)) {
      continue
    }

    // If we have an intersection, check if it has a higher rank
    const rank = LexoRank.parse(blockEntity.read(Block).rank)
    if (!intersect || rank.compareTo(maxRank) > 0) {
      intersect = blockEntity
      maxRank = rank
    }
  }

  return intersect
}
