import { BaseSystem } from '@infinitecanvas/core'
import { Block } from '@infinitecanvas/core/components'
import { ArrowHandle, ElbowArrow } from '@infinitecanvas/extension-arrows'
import { Shape } from '../components'

const EPS = 0.0001

function approximately(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS
}

function round(value: number, step: number): number {
  const result = Math.floor(value / step) * step
  return approximately(result, 0) ? step : result
}

export class UpdateEnforceGrid extends BaseSystem {
  private readonly shapes = this.query((q) => q.changed.with(Block, Shape).trackWrites.write)

  private readonly arrows = this.query((q) => q.changed.with(ElbowArrow, Block).trackWrites)

  private readonly arrowHandles = this.query((q) => q.addedOrChanged.with(Block, ArrowHandle).trackWrites)

  public execute(): void {
    if (!this.grid.enabled) return

    for (const shapeEntity of this.shapes.changed) {
      const block = shapeEntity.read(Block)

      const newLeft = round(block.left, this.grid.colWidth)
      const newTop = round(block.top, this.grid.rowHeight)
      const newWidth = round(block.width, this.grid.colWidth)
      const newHeight = round(block.height, this.grid.rowHeight)

      // check if needs update
      if (
        // approximately(block.left, newLeft) &&
        // approximately(block.top, newTop) &&
        approximately(block.width, newWidth) &&
        approximately(block.height, newHeight)
      ) {
        continue
      }

      const writableBlock = shapeEntity.write(Block)
      writableBlock.left = newLeft
      writableBlock.top = newTop
      writableBlock.width = newWidth
      writableBlock.height = newHeight
    }

    // make sure arrows don't get smaller than grid size
    for (const arrowEntity of this.arrows.changed) {
      const block = arrowEntity.read(Block)

      const newWidth = Math.max(block.width, this.grid.colWidth)
      const newHeight = Math.max(block.height, this.grid.rowHeight)

      if (approximately(block.width, newWidth) && approximately(block.height, newHeight)) {
        continue
      }

      const writableBlock = arrowEntity.write(Block)
      writableBlock.width = newWidth
      writableBlock.height = newHeight
    }

    // // center the arrow handles on the grid
    // for (const handleEntity of this.arrowHandles.addedOrChanged) {
    //   const block = handleEntity.read(Block)

    //   // // round to the center of the nearest grid cell
    //   // const center = block.getCenter()

    //   // const newLeft = Math.floor(center[0] / this.grid.colWidth) * this.grid.colWidth
    //   // const newTop = Math.floor(center[1] / this.grid.rowHeight) * this.grid.rowHeight

    //   // if (approximately(block.left, newLeft) && approximately(block.top, newTop)) {
    //   //   continue
    //   // }

    //   // const writableBlock = handleEntity.write(Block)
    //   // writableBlock.left = newLeft
    //   // writableBlock.top = newTop
    // }
  }
}
