import { BaseSystem, type BlockModel, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import { binarySearchForId, uuidToNumber } from '../helpers'
import { BlockCommand, type BlockCommandArgs, type CommandMeta, type ShapeModel, type TextModel } from '../types'
import { UpdateCamera } from './UpdateCamera'
import { UpdateCursor } from './UpdateCursor'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export class UpdateBlocks extends BaseSystem<BlockCommandArgs> {
  private readonly rankBoundsQuery = this.query((q) => q.current.with(comps.RankBounds).write)

  private get rankBounds(): comps.RankBounds {
    return this.rankBoundsQuery.current[0].write(comps.RankBounds)
  }

  // declaring to becsy that rankBounds is a singleton component
  private readonly _rankBounds = this.singleton.read(comps.RankBounds)

  private readonly blocks = this.query(
    (q) =>
      q.current
        .with(comps.Block)
        .write.orderBy((e) => uuidToNumber(e.read(comps.Block).id))
        .using(comps.Persistent, comps.Text, comps.Shape).write,
  )

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCursor, UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(BlockCommand.AddShape, this.addShape.bind(this))
    this.addCommandListener(BlockCommand.AddText, this.addText.bind(this))
    this.addCommandListener(BlockCommand.UpdateBlockPosition, this.updateBlockPosition.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private addShape(_meta: CommandMeta, block: Partial<BlockModel>, shape: Partial<ShapeModel>): void {
    block.tag = 'ic-shape'
    const entity = this._addBlock(block)

    entity.add(comps.Shape, { ...shape })
  }

  private addText(_meta: CommandMeta, block: Partial<BlockModel>, text: Partial<TextModel>): void {
    block.tag = 'ic-text'
    const entity = this._addBlock(block)

    entity.add(comps.Text, { ...text })
  }

  private _addBlock(block: Partial<BlockModel>): Entity {
    if (!block.id) {
      block.id = crypto.randomUUID()
    }

    if (!isUuid(block.id)) {
      console.warn(`Invalid block id: ${block.id}. Block id must be a valid UUID.`)
      block.id = crypto.randomUUID()
    }

    block.rank = block.rank || this.rankBounds.genNext().toString()
    block.createdBy = this.resources.uid

    return this.createEntity(comps.Block, block, comps.Persistent, { id: block.id })
  }

  private updateBlockPosition(_meta: CommandMeta, payload: { id: string; left: number; top: number }): void {
    const blockEntity = binarySearchForId(comps.Block, payload.id, this.blocks.current)
    if (!blockEntity) {
      console.warn(`Block with id ${payload.id} not found`)
      return
    }
    const block = blockEntity.write(comps.Block)
    block.left = payload.left
    block.top = payload.top
  }
}
