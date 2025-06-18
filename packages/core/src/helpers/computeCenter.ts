import type { Entity } from '@lastolivegames/becsy'
import { Block } from '../components'

export function computeCenter(entity: Entity): [number, number] {
  const block = entity.read(Block)
  return [block.left + block.width / 2, block.top + block.height / 2]
}
