import { BaseSystem, comps } from '@infinitecanvas/core'
import type { Block } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import * as blockComps from '../components'
import { BlockCommand, type BlockCommandArgs } from '../types'

export class BlockCommands extends BaseSystem<BlockCommandArgs> {
  private readonly _selectionBoxes = this.query((q) => q.current.with(comps.Block, blockComps.SelectionBox).write)

  public initialize(): void {
    this.addCommandListener(BlockCommand.AddBlock, this.addBlock.bind(this))
    this.addCommandListener(BlockCommand.UpdateBlock, this.updateBlock.bind(this))

    this.addCommandListener(BlockCommand.AddSelectionBox, this.createSelectionBox.bind(this))
    this.addCommandListener(BlockCommand.RemoveSelectionBoxes, this.removeSelectionBoxes.bind(this))
  }

  private addBlock(block: Partial<Block>): void {
    this.createEntity(comps.Block, block)
  }

  private updateBlock(blockEntity: Entity, blockPartial: Partial<Block>): void {
    Object.assign(blockEntity.write(comps.Block), blockPartial)
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
      blockComps.SelectionBox,
      {
        start,
      },
    )
  }

  private removeSelectionBoxes(): void {
    for (const selectionBox of this._selectionBoxes.current) {
      this.deleteEntity(selectionBox)
    }
  }
}
