import { BaseSystem, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import * as blockComps from '../components'
import { BlockCommand, type BlockCommandArgs } from '../types'

export class SelectionHandler extends BaseSystem<BlockCommandArgs> {
  private readonly pointer = this.singleton.read(comps.Pointer)

  private readonly selectableBlocks = this.query((q) => q.current.with(comps.Block, blockComps.Selectable))

  private readonly selectionBoxes = this.query((q) => q.current.with(comps.Block, blockComps.SelectionBox))

  public execute(): void {
    // ========================================
    // Selection box

    // create selection box when pointer is down
    if (this.pointer.downTrigger && !this.selectionBoxes.current.length) {
      const intersected = this.intersectSelectable(this.pointer.position)
      if (!intersected) {
        this.emitCommand(BlockCommand.AddSelectionBox, {
          start: [this.pointer.position[0], this.pointer.position[1]],
        })
      }
    }

    // update selection box based on pointer position and select blocks
    if (this.selectionBoxes.current.length) {
      const selectionBoxEntity = this.selectionBoxes.current[0]
      const { start } = selectionBoxEntity.read(blockComps.SelectionBox)

      const left = Math.min(start[0], this.pointer.position[0])
      const top = Math.min(start[1], this.pointer.position[1])
      const width = Math.abs(start[0] - this.pointer.position[0])
      const height = Math.abs(start[1] - this.pointer.position[1])

      this.emitCommand(BlockCommand.UpdateBlock, selectionBoxEntity, {
        left,
        top,
        width,
        height,
      })
    }

    //   const part = this.selectionBoxes.current[0].write(comps.Part)
    //   part.left = Math.min(start[0], this.input.pointer[0])
    //   part.top = Math.min(start[1], this.input.pointer[1])
    //   part.width = Math.abs(start[0] - this.input.pointer[0])
    //   part.height = Math.abs(start[1] - this.input.pointer[1])

    //   const rect: [number, number, number, number] = [part.top, part.left, part.width, part.height]
    //   let intersectedBlocks = intersectRect(rect, this.selectableBlocks.current)

    //   intersectedBlocks = getGroupedParts(intersectedBlocks)

    //   // remove select from unselected blocks
    //   for (const blockEntity of this.selectedBlocks.current) {
    //     if (!intersectedBlocks.includes(blockEntity)) {
    //       removeComponent(blockEntity, comps.Selected)
    //     }
    //   }

    //   // add selected to selected blocks
    //   for (const blockEntity of intersectedBlocks) {
    //     addComponent(blockEntity, comps.Selected)
    //   }
    // }

    // delete selection box when pointer is up
    if (this.pointer.upTrigger && this.selectionBoxes.current.length) {
      this.emitCommand(BlockCommand.RemoveSelectionBoxes)
    }
  }

  intersectSelectable(point: [number, number]): Entity | null {
    for (const blockEntity of this.selectableBlocks.current) {
      const block = blockEntity.read(comps.Block)
      if (
        point[0] >= block.left &&
        point[0] <= block.left + block.width &&
        point[1] >= block.top &&
        point[1] <= block.top + block.height
      ) {
        return blockEntity
      }
    }
    return null
  }
}
