import { World } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import { Block } from '../components/Block'
import { ToBeDeleted } from '../components/ToBeDeleted'

class Deleter extends BaseSystem {
  blocks = this.query((q) => q.current.with(Block))

  execute() {
    for (const blockEntity of this.blocks.current) {
      this.deleteEntity(blockEntity)
    }
  }
}

const toBeDeleted = new Set<string>()

class Reader extends BaseSystem {
  toBeDeleted = this.query((q) => q.current.with(ToBeDeleted).and.with(Block))

  public constructor() {
    super()
    this.schedule((s) => s.after(Deleter))
  }

  execute() {
    for (const toBeDeletedEntity of this.toBeDeleted.current) {
      toBeDeleted.add(toBeDeletedEntity.read(Block).id)
    }
  }
}

describe('Base System', () => {
  it('deleteEntity adds ToBeDeleted', async () => {
    const world = await World.create({
      defs: [Block, ToBeDeleted, Deleter, Reader],
    })

    world.createEntity(Block, {
      id: 'a',
    })

    await world.execute()
    expect(toBeDeleted.has('a')).toBe(true)
  })
})
