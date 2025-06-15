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
    left = Math.min(left, block.left)
    right = Math.max(right, block.left + block.width)
    top = Math.min(top, block.top)
    bottom = Math.max(bottom, block.top + block.height)
  }

  return { left, right, top, bottom }
}
