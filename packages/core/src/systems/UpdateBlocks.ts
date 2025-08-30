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
  private readonly rankBounds = this.singleton.write(comps.RankBounds)

  private readonly persistentBlocks = this.query((q) => q.added.current.with(comps.Block, comps.Persistent))

  private readonly selectedBlocks = this.query((q) => q.current.with(comps.Block, comps.Selected).write)

  private readonly entities = this.query(
    (q) => q.current.with(comps.Block).orderBy((e) => uuidToNumber(e.read(comps.Block).id)).usingAll.write,
  )

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCursor, UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.Cut, this.cut.bind(this))
    this.addCommandListener(CoreCommand.Copy, this.copy.bind(this))
    this.addCommandListener(CoreCommand.Paste, this.paste.bind(this))

    this.addCommandListener(CoreCommand.RemoveSelected, this.removeSelected.bind(this))
    this.addCommandListener(CoreCommand.DuplicateSelected, this.duplicateSelected.bind(this))
    this.addCommandListener(CoreCommand.BringForwardSelected, this.bringForwardSelected.bind(this))
    this.addCommandListener(CoreCommand.SendBackwardSelected, this.sendBackwardSelected.bind(this))

    this.addCommandListener(CoreCommand.UpdateFromSnapshot, this.updateFromSnapshot.bind(this))
    this.addCommandListener(CoreCommand.CreateFromSnapshot, this.createFromSnapshot.bind(this))

    this.addCommandListener(CoreCommand.SelectBlock, this.selectBlock.bind(this))
    this.addCommandListener(CoreCommand.DeselectBlock, this.deselectBlock.bind(this))
    this.addCommandListener(CoreCommand.DeselectAll, this.deselectAll.bind(this))
    this.addCommandListener(CoreCommand.SelectAll, this.selectAll.bind(this))

    // this.addCommandListener(CoreCommand.Undo, this.deselectAll.bind(this))
    // this.addCommandListener(CoreCommand.Redo, this.deselectAll.bind(this))
  }

  public execute(): void {
    // update rank bounds
    if (this.frame.value === 1) {
      for (const blockEntity of this.persistentBlocks.added) {
        const { rank } = blockEntity.read(comps.Block)
        this.rankBounds.add(LexoRank.parse(rank))
      }
    }

    this.executeCommands()
  }

  private cut(): void {
    const snapshot = this._getSnapshot(this.selectedBlocks.current)
    this.resources.history.clipboard = snapshot

    this.removeSelected()
  }

  private copy(): void {
    const snapshot = this._getSnapshot(this.selectedBlocks.current)
    this.resources.history.clipboard = snapshot
  }

  private paste(): void {
    const clipboard = this.resources.history.clipboard
    if (!clipboard) return

    const addedBlocks = this._duplicateSnapshot(clipboard, [25, 25])
    this.selectBlocks(addedBlocks, { deselectOthers: true })
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
    const snapshot = this._getSnapshot(this.selectedBlocks.current)
    const addedBlocks = this._duplicateSnapshot(snapshot, [25, 25])

    this.selectBlocks(addedBlocks, { deselectOthers: true })

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }

  private _getSnapshot(entities: readonly Entity[]): Snapshot {
    const mySelectedBlockIds = entities
      .filter((blockEntity) => blockEntity.read(comps.Selected).selectedBy === this.resources.uid)
      .map((blockEntity) => blockEntity.read(comps.Block).id)

    const snapshot = this.resources.history.getEntities(mySelectedBlockIds)

    return snapshot
  }

  private _duplicateSnapshot(snapshot: Snapshot, offset: [number, number]): Entity[] {
    const newSnapshot: Snapshot = {}

    // sort blocks by rank
    const blocks: Block[] = []
    for (const entity of Object.values(snapshot)) {
      blocks.push(entity.Block as unknown as Block)
    }
    blocks.sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank)))

    for (const block of blocks) {
      const newId = crypto.randomUUID()
      newSnapshot[newId] = {
        ...snapshot[block.id],
        Block: {
          ...block,
          id: newId,
          rank: this.rankBounds.genNext().toString(),
          left: block.left + offset[0],
          top: block.top + offset[1],
        },
      }
    }

    const diff = new Diff()
    diff.added = newSnapshot

    const { added } = applyDiff(this, diff, this.entities)

    return added
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

    // this.emitCommand(CoreCommand.CreateCheckpoint)
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

    const { added } = applyDiff(this, diff, this.entities)

    for (const blockEntity of added) {
      blockEntity.add(comps.Selected, { selectedBy: this.resources.uid })

      const block = blockEntity.read(comps.Block)
      const blockDef = this.getBlockDef(block.tag)
      if (blockDef?.canEdit) {
        blockEntity.add(comps.Edited)
        break
      }
    }
  }

  private deselectAll(): void {
    for (const blockEntity of this.selectedBlocks.current) {
      if (blockEntity.has(comps.Selected) && blockEntity.read(comps.Selected).selectedBy === this.resources.uid) {
        blockEntity.remove(comps.Selected)
      }
    }

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }

  private selectBlock(blockEntity: Entity, options: { deselectOthers?: boolean } = {}): void {
    this.selectBlocks([blockEntity], options)
  }

  private selectBlocks(blockEntities: Entity[], options: { deselectOthers?: boolean } = {}): void {
    if (options.deselectOthers) {
      this.deselectAll()
    }

    for (const blockEntity of blockEntities) {
      blockEntity.add(comps.Selected, { selectedBy: this.resources.uid })
    }
  }

  private deselectBlock(blockEntity: Entity): void {
    if (!blockEntity.has(comps.Selected)) return
    if (blockEntity.read(comps.Selected).selectedBy !== this.resources.uid) return

    blockEntity.remove(comps.Selected)
  }

  private selectAll(): void {
    for (const blockEntity of this.persistentBlocks.current) {
      if (!blockEntity.has(comps.Selected)) {
        blockEntity.add(comps.Selected, { selectedBy: this.resources.uid })
      }
    }
  }
}
