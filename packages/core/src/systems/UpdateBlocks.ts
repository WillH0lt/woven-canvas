import { BaseSystem, type BlockModel, Diff, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'

import type { State } from '../History'
import { applyDiff, binarySearchForId, uuidToNumber } from '../helpers'
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
      q.current.added
        .with(comps.Block)
        .write.orderBy((e) => uuidToNumber(e.read(comps.Block).id))
        .using(comps.Persistent, comps.Text, comps.Shape).write,
  )

  private readonly persistentBlocks = this.query((q) => q.added.with(comps.Block, comps.Persistent))

  private readonly selectedBlocks = this.query((q) => q.current.with(comps.Block, comps.Selected).write)

  private readonly entities = this.query(
    (q) => q.current.with(comps.Persistent).orderBy((e) => uuidToNumber(e.read(comps.Persistent).id)).usingAll.write,
  )

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCursor, UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(BlockCommand.AddShape, this.addShape.bind(this))
    this.addCommandListener(BlockCommand.AddText, this.addText.bind(this))
    this.addCommandListener(BlockCommand.UpdateBlockPosition, this.updateBlockPosition.bind(this))
    this.addCommandListener(BlockCommand.RemoveSelected, this.removeSelected.bind(this))
    this.addCommandListener(BlockCommand.DuplicateSelected, this.duplicateSelected.bind(this))
    this.addCommandListener(BlockCommand.BringForwardSelected, this.bringForwardSelected.bind(this))
    this.addCommandListener(BlockCommand.SendBackwardSelected, this.sendBackwardSelected.bind(this))
  }

  public execute(): void {
    // update rank bounds
    for (const blockEntity of this.persistentBlocks.added) {
      const { rank } = blockEntity.read(comps.Block)
      this.rankBounds.add(LexoRank.parse(rank))
    }

    this.executeCommands()
  }

  private addShape(_meta: CommandMeta, block: Partial<BlockModel>, shape: Partial<ShapeModel>): void {
    block.kind = 'ic-shape'
    const entity = this._addBlock(block)

    entity.add(comps.Shape, { ...shape })
  }

  private addText(_meta: CommandMeta, block: Partial<BlockModel>, text: Partial<TextModel>): void {
    block.kind = 'ic-text'
    block.stretchableWidth = true
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

  private removeSelected(meta: CommandMeta): void {
    for (const blockEntity of this.selectedBlocks.current) {
      if (blockEntity.read(comps.Selected).selectedBy === meta.uid) {
        this.deleteEntity(blockEntity)
      }
    }

    this.emitCommand(BlockCommand.CreateCheckpoint)
  }

  private duplicateSelected(_meta: CommandMeta): void {
    const mySelectedBlockIds = this.selectedBlocks.current
      .filter((blockEntity) => blockEntity.read(comps.Selected).selectedBy === this.resources.uid)
      .map((blockEntity) => blockEntity.read(comps.Block).id)

    const entities = this.resources.history.getEntities(mySelectedBlockIds)

    // sort blocks by rank
    const blocks: BlockModel[] = []
    for (const entity of Object.values(entities)) {
      blocks.push(entity.Block as unknown as BlockModel)
    }
    blocks.sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank)))

    // build new entities
    const newEntities: State = {}
    for (const block of blocks) {
      const newId = crypto.randomUUID()
      newEntities[newId] = {
        ...entities[block.id],
        Block: {
          ...block,
          id: newId,
          rank: this.rankBounds.genNext().toString(),
        },
      }
    }

    const diff = new Diff()
    diff.added = newEntities

    applyDiff(this, diff, this.entities)

    this.emitCommand(BlockCommand.CreateCheckpoint)
  }

  private bringForwardSelected(_meta: CommandMeta): void {
    const mySelectedBlocks = this.selectedBlocks.current.filter(
      (blockEntity) => blockEntity.read(comps.Selected).selectedBy === this.resources.uid,
    )

    // sort blocks by rank
    mySelectedBlocks.sort((a, b) => {
      const rankA = LexoRank.parse(a.read(comps.Block).rank)
      const rankB = LexoRank.parse(b.read(comps.Block).rank)
      return rankA.compareTo(rankB)
    })

    for (const blockEntity of mySelectedBlocks) {
      const block = blockEntity.write(comps.Block)
      block.rank = this.rankBounds.genNext().toString()
    }

    this.emitCommand(BlockCommand.CreateCheckpoint)
  }

  private sendBackwardSelected(_meta: CommandMeta): void {
    const mySelectedBlocks = this.selectedBlocks.current.filter(
      (blockEntity) => blockEntity.read(comps.Selected).selectedBy === this.resources.uid,
    )

    // sort blocks by rank
    mySelectedBlocks.sort((a, b) => {
      const rankA = LexoRank.parse(a.read(comps.Block).rank)
      const rankB = LexoRank.parse(b.read(comps.Block).rank)
      return rankB.compareTo(rankA) // reverse order for send backward
    })

    for (const blockEntity of mySelectedBlocks) {
      const block = blockEntity.write(comps.Block)
      block.rank = this.rankBounds.genPrev().toString()
    }

    this.emitCommand(BlockCommand.CreateCheckpoint)
  }
}
