import { BaseSystem } from '@infinitecanvas/core'
import { Block, Persistent } from '@infinitecanvas/core/components'

const EPS = 0.0001

function approximately(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS
}

function round(value: number, step: number): number {
  const result = Math.round(value / step) * step
  return approximately(result, 0) ? step : result
}

export class UpdateEnforceGrid extends BaseSystem {
  private readonly blocks = this.query((q) => q.changed.with(Persistent).and.with(Block).trackWrites.write)

  public execute(): void {
    if (!this.grid.enabled) return

    for (const blockEntity of this.blocks.changed) {
      const block = blockEntity.read(Block)

      const newLeft = round(block.left, this.grid.colWidth)
      const newTop = round(block.top, this.grid.rowHeight)
      const newWidth = round(block.width, this.grid.colWidth)
      const newHeight = round(block.height, this.grid.rowHeight)

      // check if needs update
      if (
        approximately(block.left, newLeft) &&
        approximately(block.top, newTop) &&
        approximately(block.width, newWidth) &&
        approximately(block.height, newHeight)
      ) {
        continue
      }

      const writableBlock = blockEntity.write(Block)
      writableBlock.left = newLeft
      writableBlock.top = newTop
      writableBlock.width = newWidth
      writableBlock.height = newHeight
    }
  }
}
