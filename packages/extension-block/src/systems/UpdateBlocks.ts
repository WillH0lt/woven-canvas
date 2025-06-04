import { BaseSystem, comps as coreComps } from '@infinitecanvas/core'
import type { Block } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import * as blockComps from '../components'
import { BlockCommand, type BlockCommandArgs, DragState, type Dragged } from '../types'

const comps = {
  ...coreComps,
  ...blockComps,
}

export class UpdateBlocks extends BaseSystem<BlockCommandArgs> {
  private readonly _blocks = this.query((q) => q.with(comps.Block).write.using(comps.Draggable, comps.Dragged).write)

  private readonly selectionBoxes = this.query((q) => q.current.with(comps.Block, comps.SelectionBox).write)

  public initialize(): void {
    this.addCommandListener(BlockCommand.AddBlock, this.addBlock.bind(this))
    this.addCommandListener(BlockCommand.UpdateBlock, this.updateBlock.bind(this))
    this.addCommandListener(BlockCommand.TranslateBlock, this.translateBlock.bind(this))

    this.addCommandListener(BlockCommand.AddSelectionBox, this.createSelectionBox.bind(this))
    this.addCommandListener(BlockCommand.RemoveSelectionBoxes, this.removeSelectionBoxes.bind(this))

    this.addCommandListener(BlockCommand.StartDrag, this.startDrag.bind(this))
    this.addCommandListener(BlockCommand.UpdateDrag, this.updateDrag.bind(this))
  }

  private addBlock(block: Partial<Block>): void {
    this.createEntity(comps.Block, block, comps.Draggable)
  }

  private updateBlock(blockEntity: Entity, blockPartial: Partial<Block>): void {
    Object.assign(blockEntity.write(comps.Block), blockPartial)
  }

  private translateBlock(blockEntity: Entity, payload: { dx: number; dy: number }): void {
    const block = blockEntity.write(comps.Block)
    block.left += payload.dx
    block.top += payload.dy
  }

  private createSelectionBox(payload: { start: [number, number] }): void {
    const { start } = payload

    this.createEntity(
      comps.Block,
      {
        left: start[0],
        top: start[1],
        alpha: 255,
      },
      comps.SelectionBox,
      {
        start,
      },
    )
  }

  private removeSelectionBoxes(): void {
    for (const selectionBox of this.selectionBoxes.current) {
      this.deleteEntity(selectionBox)
    }
  }

  private startDrag(blockEntity: Entity, drag: Partial<Dragged>): void {
    blockEntity.add(comps.Dragged, {
      ...drag,
    })
  }

  private updateDrag(blockEntity: Entity, drag: Partial<Dragged>): void {
    const dragged = blockEntity.write(comps.Dragged)
    Object.assign(dragged, drag)

    const block = blockEntity.write(comps.Block)
    block.left = dragged.blockStart[0] + dragged.delta[0]
    block.top = dragged.blockStart[1] + dragged.delta[1]

    if (dragged.state === DragState.End) {
      blockEntity.remove(comps.Dragged)
    }
  }
}
