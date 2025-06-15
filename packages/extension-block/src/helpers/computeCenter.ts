import { comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

export function computeCenter(entity: Entity): [number, number] {
  const block = entity.read(comps.Block)
  return [block.left + block.width / 2, block.top + block.height / 2]
}
