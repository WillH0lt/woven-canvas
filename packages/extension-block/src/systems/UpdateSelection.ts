import { BaseSystem, comps as coreComps } from '@infinitecanvas/core'
import type { BlockModel } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import * as blockComps from '../components'
import { SELECTION_BOX_RANK } from '../constants'
import { intersectBlock } from '../helpers'
import { BlockCommand, type BlockCommandArgs, type SelectBlockOptions } from '../types'

const comps = {
  ...coreComps,
  ...blockComps,
}

export class UpdateSelection extends BaseSystem<BlockCommandArgs> {
  private readonly rankBounds = this.singleton.write(comps.RankBounds)

  private readonly selectableBlocks = this.query(
    (q) => q.current.with(comps.Block, comps.Draggable, comps.Selectable).write,
  )

  private readonly selectedBlocks = this.query((q) => q.current.with(comps.Block, comps.Selected).write)

  private readonly selectionBoxes = this.query((q) => q.current.with(comps.Block, comps.SelectionBox).write)

  public initialize(): void {
    this.addCommandListener(BlockCommand.AddBlock, this.addBlock.bind(this))
    this.addCommandListener(BlockCommand.UpdateBlockPosition, this.updateSelectablePosition.bind(this))

    this.addCommandListener(BlockCommand.AddSelectionBox, this.addSelectionBox.bind(this))
    this.addCommandListener(BlockCommand.UpdateSelectionBox, this.updateSelectionBox.bind(this))
    this.addCommandListener(BlockCommand.RemoveSelectionBoxes, this.removeSelectionBoxes.bind(this))

    this.addCommandListener(BlockCommand.SelectBlock, this.selectBlock.bind(this))
    this.addCommandListener(BlockCommand.DeselectBlock, this.deselectBlock.bind(this))
    this.addCommandListener(BlockCommand.DeselectAll, this.deselectAll.bind(this))
    this.addCommandListener(BlockCommand.RemoveSelected, this.removeSelected.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private addBlock(block: Partial<BlockModel>): void {
    block.id = block.id || crypto.randomUUID()
    block.rank = block.rank || this.rankBounds.genNext().toString()

    this.createEntity(comps.Block, block, comps.Selectable, comps.Draggable, comps.Storable, { id: block.id })
  }

  private updateSelectablePosition(blockEntity: Entity, position: { left: number; top: number }): void {
    if (!blockEntity.has(comps.Selectable)) return
    Object.assign(blockEntity.write(comps.Block), position)
  }

  private addSelectionBox(block: Partial<BlockModel>): void {
    block.id = block.id || crypto.randomUUID()
    block.rank = block.rank || SELECTION_BOX_RANK
    this.createEntity(comps.Block, block, comps.SelectionBox)
  }

  private updateSelectionBox(blockPartial: Partial<BlockModel>): void {
    if (this.selectionBoxes.current.length === 0) {
      console.warn('No selection box entity found to update.')
      return
    }

    const blockEntity = this.selectionBoxes.current[0]
    const block = blockEntity.write(comps.Block)
    Object.assign(block, blockPartial)

    const intersectedEntities = intersectBlock(block, this.selectableBlocks.current)
    for (const selectedEntity of this.selectedBlocks.current) {
      const shouldDeselect = !intersectedEntities.some((entity) => entity.isSame(selectedEntity))
      if (shouldDeselect) {
        this.deselectBlock(selectedEntity)
      }
    }

    for (const entity of intersectedEntities) {
      this.selectBlock(entity)
    }
  }

  private removeSelectionBoxes(): void {
    for (const selectionBoxEntity of this.selectionBoxes.current) {
      this.deleteEntity(selectionBoxEntity)
    }
  }

  private deselectAll(): void {
    for (const blockEntity of this.selectedBlocks.current) {
      this.deselectBlock(blockEntity)
    }
  }

  private selectBlock(blockEntity: Entity, options: SelectBlockOptions = {}): void {
    if (options.deselectOthers) {
      this.deselectAll()
    }

    if (blockEntity.has(comps.Selected)) return

    const block = blockEntity.write(comps.Block)
    block.green = 255

    // blockEntity.add(comps.Selected)

    blockEntity.add(comps.Selected, {
      startLeft: block.left,
      startTop: block.top,
      startWidth: block.width,
      startHeight: block.height,
      startRotateZ: block.rotateZ,
    })
  }

  private deselectBlock(blockEntity: Entity): void {
    if (!blockEntity.has(comps.Selected)) return
    blockEntity.remove(comps.Selected)

    const block = blockEntity.write(comps.Block)
    block.green = 0
  }

  private removeSelected(): void {
    for (const blockEntity of this.selectedBlocks.current) {
      this.deleteEntity(blockEntity)
    }
  }
}
