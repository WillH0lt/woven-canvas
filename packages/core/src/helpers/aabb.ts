import type { Entity } from '@lastolivegames/becsy'
import { Aabb, Block } from '../components'

export function computeAabb(blockEntity: Readonly<Entity>): Aabb {
  const block = blockEntity.read(Block)
  const halfWidth = block.width / 2
  const halfHeight = block.height / 2
  const center = [block.left + halfWidth, block.top + halfHeight]

  let w = block.width
  let h = block.height
  let angle = block.rotateZ % Math.PI

  if (angle !== 0) {
    angle = Math.abs(angle)
    angle = Math.min(angle, Math.PI - angle)

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    w = block.width * cos + block.height * sin
    h = block.width * sin + block.height * cos
  }

  const left = center[0] - w / 2
  const right = center[0] + w / 2
  const top = center[1] - h / 2
  const bottom = center[1] + h / 2

  return new Aabb({ left, right, top, bottom })
}
