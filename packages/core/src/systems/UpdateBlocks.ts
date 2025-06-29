import { BaseSystem, type BlockModel, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import { BlockCommand, type BlockCommandArgs } from '../types'
import { UpdateCamera } from './UpdateCamera'
import { UpdateCursor } from './UpdateCursor'

export class UpdateBlocks extends BaseSystem<BlockCommandArgs> {
  private readonly rankBoundsQuery = this.query((q) => q.current.with(comps.RankBounds).write)

  private get rankBounds(): comps.RankBounds {
    return this.rankBoundsQuery.current[0].write(comps.RankBounds)
  }

  // declaring to becsy that rankBounds is a singleton component
  private readonly _rankBounds = this.singleton.read(comps.RankBounds)

  private readonly _blocks = this.query((q) => q.with(comps.Block, comps.Persistent).write)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCursor, UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(BlockCommand.AddBlock, this.addBlock.bind(this))
    this.addCommandListener(BlockCommand.UpdateBlockPosition, this.updateBlockPosition.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private addBlock(block: Partial<BlockModel>): void {
    block.id = block.id || crypto.randomUUID()
    block.rank = block.rank || this.rankBounds.genNext().toString()

    this.createEntity(comps.Block, block, comps.Persistent, { id: block.id })
  }

  private updateBlockPosition(blockEntity: Entity, position: { left: number; top: number }): void {
    const block = blockEntity.write(comps.Block)
    block.left = position.left
    block.top = position.top
  }
}
