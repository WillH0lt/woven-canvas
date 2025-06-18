import type { Entity } from '@lastolivegames/becsy'
import { Aabb, Block } from '../components'
import type { AabbModel } from '../types'
import { rotatePoint } from './rotatePoint'

export function computeExtentsAlongAngle(blockEntities: readonly Entity[], rotateZ: number): AabbModel {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const blockEntity of blockEntities) {
    if (rotateZ === 0) {
      const aabb = blockEntity.read(Aabb)
      minX = Math.min(minX, aabb.left)
      minY = Math.min(minY, aabb.top)
      maxX = Math.max(maxX, aabb.right)
      maxY = Math.max(maxY, aabb.bottom)
    } else {
      const block = blockEntity.read(Block)
      const center: [number, number] = [block.left + block.width / 2, block.top + block.height / 2]
      const p1 = rotatePoint([block.left, block.top], center, block.rotateZ)
      const p2 = rotatePoint([block.left + block.width, block.top], center, block.rotateZ)
      const p3 = rotatePoint([block.left + block.width, block.top + block.height], center, block.rotateZ)
      const p4 = rotatePoint([block.left, block.top + block.height], center, block.rotateZ)

      const r1 = rotatePoint(p1, [0, 0], -rotateZ)
      const r2 = rotatePoint(p2, [0, 0], -rotateZ)
      const r3 = rotatePoint(p3, [0, 0], -rotateZ)
      const r4 = rotatePoint(p4, [0, 0], -rotateZ)

      minX = Math.min(minX, r1[0], r2[0], r3[0], r4[0])
      minY = Math.min(minY, r1[1], r2[1], r3[1], r4[1])
      maxX = Math.max(maxX, r1[0], r2[0], r3[0], r4[0])
      maxY = Math.max(maxY, r1[1], r2[1], r3[1], r4[1])
    }
  }

  const center: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2]
  const width = maxX - minX
  const height = maxY - minY

  const newCenter = rotatePoint(center, [0, 0], rotateZ)
  const left = newCenter[0] - width / 2
  const top = newCenter[1] - height / 2

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  }
}
