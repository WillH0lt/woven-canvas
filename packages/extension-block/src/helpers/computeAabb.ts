import { comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import type { AabbModel } from '../types'

export function computeAabb(blockEntities: readonly Entity[]): AabbModel {
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const blockEntity of blockEntities) {
    const block = blockEntity.read(comps.Block)
    const halfWidth = block.width / 2
    const halfHeight = block.height / 2
    const center = [block.left + halfWidth, block.top + halfHeight]

    let angle = block.rotateZ % Math.PI
    angle = Math.abs(angle)
    angle = Math.min(angle, Math.PI - angle)

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const w = block.width * cos + block.height * sin
    const h = block.width * sin + block.height * cos

    left = Math.min(left, center[0] - w / 2)
    right = Math.max(right, center[0] + w / 2)
    top = Math.min(top, center[1] - h / 2)
    bottom = Math.max(bottom, center[1] + h / 2)
  }

  return { left, right, top, bottom }
}
