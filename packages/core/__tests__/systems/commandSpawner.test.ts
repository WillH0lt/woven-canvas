import { System, World } from '@lastolivegames/becsy'
import { beforeEach, describe, expect, it } from 'vitest'
import { Block } from '../../src/components/Block'
import { ToBeDeleted } from '../../src/components/ToBeDeleted'
import { Deleter } from '../../src/systems/PostUpdateDeleter'
import { CommandSpawner } from '../../src/systems/PreInputCommandSpawner'

let world: World

function createBlock(world: World, id: string, toBeDeleted = false) {
  const blockData = {
    id,
  }
  if (toBeDeleted) {
    world.createEntity(Block, blockData, ToBeDeleted)
  } else {
    world.createEntity(Block, blockData)
  }
}

const currentBlocks = new Set<string>()

class Reader extends System {
  private readonly blocks = this.query((q) => q.current.and.removed.with(Block))

  public constructor() {
    super()
    this.schedule((s) => s.after(Deleter))
  }

  public execute() {
    for (const entity of this.blocks.current) {
      currentBlocks.add(entity.read(Block).id)
    }
  }
}

describe('CommandSpawner System', () => {
  beforeEach(async () => {
    world = await World.create({
      defs: [Block, ToBeDeleted, CommandSpawner, Reader],
    })
  })

  it('should delete entities with ToBeDeleted component', async () => {
    createBlock(world, 'block1', true)
    createBlock(world, 'block2', false)
    await world.execute()
    expect(currentBlocks.has('block1')).toBe(false)
    expect(currentBlocks.has('block2')).toBe(true)
  })
})
