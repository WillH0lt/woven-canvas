import type { Entity, System } from '@lastolivegames/becsy'

import * as comps from '../components'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function createBlock(system: System, block: Partial<comps.Block>, rankBounds: comps.RankBounds): Entity {
  if (!block.id) {
    block.id = crypto.randomUUID()
  }

  if (!isUuid(block.id)) {
    console.warn(`Invalid block id: ${block.id}. Block id must be a valid UUID.`)
    block.id = crypto.randomUUID()
  }

  block.rank = block.rank || rankBounds.genNext().toString()

  return system.createEntity(comps.Block, block, comps.Persistent, { id: block.id })
}
