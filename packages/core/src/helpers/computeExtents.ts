import type { Entity } from '@lastolivegames/becsy'
import { Aabb } from '../components'

export function computeExtents(blockEntities: readonly Entity[]): Aabb {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const blockEntity of blockEntities) {
    const aabb = blockEntity.read(Aabb)
    minX = Math.min(minX, aabb.left)
    minY = Math.min(minY, aabb.top)
    maxX = Math.max(maxX, aabb.right)
    maxY = Math.max(maxY, aabb.bottom)
  }

  const center: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2]
  const width = maxX - minX
  const height = maxY - minY

  const left = center[0] - width / 2
  const top = center[1] - height / 2

  return new Aabb({
    left,
    top,
    right: left + width,
    bottom: top + height,
  })
}
