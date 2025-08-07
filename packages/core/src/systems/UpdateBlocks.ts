import type { Entity } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'

import { BaseSystem } from '../BaseSystem'
import { Diff } from '../History'
import type { Snapshot } from '../History'
import * as comps from '../components'
import type { Block } from '../components'
import { applyDiff, uuidToNumber } from '../helpers'
import { CoreCommand, type CoreCommandArgs } from '../types'
import { UpdateCamera } from './UpdateCamera'
import { UpdateCursor } from './UpdateCursor'

export class UpdateBlocks extends BaseSystem<CoreCommandArgs> {
  private readonly rankBoundsQuery = this.query((q) => q.current.with(comps.RankBounds).write)

  private get rankBounds(): comps.RankBounds {
    return this.rankBoundsQuery.current[0].write(comps.RankBounds)
  }

  // declaring to becsy that rankBounds is a singleton component
  private readonly _rankBounds = this.singleton.read(comps.RankBounds)

  private readonly persistentBlocks = this.query((q) => q.added.with(comps.Block, comps.Persistent))

  private readonly selectedBlocks = this.query((q) => q.current.with(comps.Block, comps.Selected).write)

  private readonly entities = this.query(
    (q) => q.current.with(comps.Block).orderBy((e) => uuidToNumber(e.read(comps.Block).id)).usingAll.write,
  )

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCursor, UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.RemoveSelected, this.removeSelected.bind(this))
    this.addCommandListener(CoreCommand.DuplicateSelected, this.duplicateSelected.bind(this))
    this.addCommandListener(CoreCommand.BringForwardSelected, this.bringForwardSelected.bind(this))
    this.addCommandListener(CoreCommand.SendBackwardSelected, this.sendBackwardSelected.bind(this))

    this.addCommandListener(CoreCommand.UpdateFromSnapshot, this.updateFromSnapshot.bind(this))
    this.addCommandListener(CoreCommand.CreateFromSnapshot, this.createFromSnapshot.bind(this))
  }

  public execute(): void {
    // update rank bounds
    for (const blockEntity of this.persistentBlocks.added) {
      const { rank } = blockEntity.read(comps.Block)
      this.rankBounds.add(LexoRank.parse(rank))
    }

    this.executeCommands()
  }

  private updateBlock(blockEntity: Entity, updates: Partial<Block>): void {
    const block = blockEntity.write(comps.Block)
    Object.assign(block, updates)
  }

  private removeSelected(): void {
    for (const blockEntity of this.selectedBlocks.current) {
      if (blockEntity.read(comps.Selected).selectedBy === this.resources.uid) {
        this.deleteEntity(blockEntity)
      }
    }

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }

  private duplicateSelected(): void {
    const mySelectedBlockIds = this.selectedBlocks.current
      .filter((blockEntity) => blockEntity.read(comps.Selected).selectedBy === this.resources.uid)
      .map((blockEntity) => blockEntity.read(comps.Block).id)

    const entities = this.resources.history.getEntities(mySelectedBlockIds)

    // sort blocks by rank
    const blocks: Block[] = []
    for (const entity of Object.values(entities)) {
      blocks.push(entity.Block as unknown as Block)
    }
    blocks.sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank)))

    // build new entities
    const newEntities: Snapshot = {}
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

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }

  private bringForwardSelected(): void {
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

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }

  private sendBackwardSelected(): void {
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

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }

  private updateFromSnapshot(snapshot: Snapshot): void {
    const diff = new Diff()
    diff.changedTo = snapshot

    applyDiff(this, diff, this.entities)

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }

  private createFromSnapshot(snapshot: Snapshot): void {
    for (const id of Object.keys(snapshot)) {
      if (!snapshot[id].Block) {
        console.error(`Block with id ${id} does not have a Block component. Skipping.`)
        delete snapshot[id]
        continue
      }

      const block = snapshot[id].Block as Partial<Block>
      if (block.id !== id) {
        console.warn(`Block id mismatch: expected ${id}, got ${block.id}. Updating id.`)
        block.id = id
      }

      if (!block.rank) {
        block.rank = this.rankBounds.genNext().toString()
      }

      try {
        LexoRank.parse(block.rank)
      } catch (err: any) {
        console.error(`Invalid block rank for block with id ${id}: ${block.rank}. Error: ${err.message}`)
        delete snapshot[id]
      }
    }

    const diff = new Diff()
    diff.added = snapshot

    console.log('Creating blocks from snapshot:', diff.added)

    applyDiff(this, diff, this.entities)

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }
}
