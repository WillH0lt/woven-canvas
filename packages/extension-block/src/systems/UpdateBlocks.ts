import { BaseSystem, comps as coreComps } from '@infinitecanvas/core'
import type { Block } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import * as blockComps from '../components'
import { BlockCommand, type BlockCommandArgs } from '../types'

const comps = {
  ...coreComps,
  ...blockComps,
}

export class UpdateBlocks extends BaseSystem<BlockCommandArgs> {
  private readonly _blocks = this.query((q) => q.with(comps.Block).write.using(comps.Selectable).write)

  private readonly selectionBoxes = this.query((q) => q.current.with(comps.Block, comps.SelectionBox).write)

  public initialize(): void {
    this.addCommandListener(BlockCommand.AddBlock, this.addBlock.bind(this))
    this.addCommandListener(BlockCommand.UpdateBlock, this.updateBlock.bind(this))

    this.addCommandListener(BlockCommand.AddSelectionBox, this.addSelectionBox.bind(this))
    this.addCommandListener(BlockCommand.UpdateSelectionBox, this.updateSelectionBox.bind(this))
    this.addCommandListener(BlockCommand.RemoveSelectionBoxes, this.removeSelectionBoxes.bind(this))
  }

  private addBlock(block: Partial<Block>): void {
    this.createEntity(comps.Block, block, comps.Selectable)
  }

  private updateBlock(blockEntity: Entity, blockPartial: Partial<Block>): void {
    Object.assign(blockEntity.write(comps.Block), blockPartial)
  }

  private addSelectionBox(block: Partial<Block>): void {
    this.createEntity(comps.Block, block, comps.SelectionBox)
  }

  private updateSelectionBox(blockPartial: Partial<Block>): void {
    if (this.selectionBoxes.current.length === 0) {
      console.warn('No selection box entity found to update.')
      return
    }
    const blockEntity = this.selectionBoxes.current[0]
    const block = blockEntity.write(comps.Block)
    Object.assign(block, blockPartial)
  }

  private removeSelectionBoxes(): void {
    for (const selectionBoxEntity of this.selectionBoxes.current) {
      this.deleteEntity(selectionBoxEntity)
    }
  }
}
