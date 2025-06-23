import { BaseSystem, type BlockModel, comps } from '@infinitecanvas/core'
import { computeAabb } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'

import { SELECTION_BOX_RANK } from '../constants'
import { intersectAabb } from '../helpers'
import { ControlCommand, type ControlCommandArgs, type SelectBlockOptions } from '../types'

export class UpdateSelection extends BaseSystem<ControlCommandArgs> {
  private readonly rankBoundsQuery = this.query((q) => q.current.with(comps.RankBounds).write)

  private get rankBounds(): comps.RankBounds {
    return this.rankBoundsQuery.current[0].write(comps.RankBounds)
  }

  // declaring to becsy that rankBounds is a singleton component
  private readonly _rankBounds = this.singleton.read(comps.RankBounds)

  private readonly selectableBlocks = this.query(
    (q) => q.current.with(comps.Block, comps.Draggable, comps.Selectable).write.using(comps.Aabb).read,
  )

  private readonly selectedBlocks = this.query((q) => q.current.with(comps.Block, comps.Selected).write)

  private readonly selectionBoxes = this.query((q) => q.current.with(comps.Block, comps.SelectionBox).write)

  public initialize(): void {
    // this.addCommandListener(BlockCommand.AddBlock, this.addBlock.bind(this))
    // this.addCommandListener(BlockCommand.UpdateBlockPosition, this.updateSelectablePosition.bind(this))

    this.addCommandListener(ControlCommand.AddSelectionBox, this.addSelectionBox.bind(this))
    this.addCommandListener(ControlCommand.UpdateSelectionBox, this.updateSelectionBox.bind(this))
    this.addCommandListener(ControlCommand.RemoveSelectionBoxes, this.removeSelectionBoxes.bind(this))

    this.addCommandListener(ControlCommand.SelectBlock, this.selectBlock.bind(this))
    this.addCommandListener(ControlCommand.DeselectBlock, this.deselectBlock.bind(this))
    this.addCommandListener(ControlCommand.DeselectAll, this.deselectAll.bind(this))
    this.addCommandListener(ControlCommand.RemoveSelected, this.removeSelected.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  // private addBlock(block: Partial<BlockModel>): void {
  //   block.id = block.id || crypto.randomUUID()
  //   block.rank = block.rank || this.rankBounds.genNext().toString()

  //   this.createEntity(comps.Block, block, comps.Selectable, comps.Draggable, comps.Storable, { id: block.id })
  // }

  // private updateSelectablePosition(blockEntity: Entity, position: { left: number; top: number }): void {
  //   if (!blockEntity.has(comps.Selectable)) return
  //   Object.assign(blockEntity.write(comps.Block), position)
  // }

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

    // const aabb = { left: block.left, top: block.top, right: block.left + block.width, bottom: block.bottom }
    const aabb = computeAabb(blockEntity)
    const intersectedEntities = intersectAabb(aabb, this.selectableBlocks.current)
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

    blockEntity.add(comps.Selected)

    // if (blockEntity.has(comps.Draggable)) {
    //   const draggable = blockEntity.write(comps.Draggable)
    //   draggable.startHeight = block.height
    //   draggable.startWidth = block.width
    //   draggable.startLeft = block.left
    //   draggable.startTop = block.top
    //   draggable.startRotateZ = block.rotateZ
    // }
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
