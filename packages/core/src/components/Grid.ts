import { component, field } from '@lastolivegames/becsy'
import type { Block } from './Block'

type Mode = 'round' | 'floor' | 'ceil'

@component
export class Grid {
  @field.boolean public declare enabled: boolean
  @field.float64 public declare colWidth: number
  @field.float64 public declare rowHeight: number

  public snapToGrid(position: [number, number], mode: Mode = 'round'): void {
    if (!this.enabled) {
      return
    }

    if (mode === 'floor') {
      position[0] = Math.floor(position[0] / this.colWidth) * this.colWidth
      position[1] = Math.floor(position[1] / this.rowHeight) * this.rowHeight
      return
    }

    if (mode === 'ceil') {
      position[0] = Math.ceil(position[0] / this.colWidth) * this.colWidth
      position[1] = Math.ceil(position[1] / this.rowHeight) * this.rowHeight
      return
    }

    // default to round
    position[0] = Math.round(position[0] / this.colWidth) * this.colWidth
    position[1] = Math.round(position[1] / this.rowHeight) * this.rowHeight
  }

  public snapBlockPositionToGrid(block: Block): void {
    const position: [number, number] = [block.left, block.top]
    this.snapToGrid(position, 'floor')
    block.left = position[0]
    block.top = position[1]
  }

  public snapBlockSizeToGrid(block: Block): void {
    const size: [number, number] = [block.width, block.height]
    this.snapToGrid(size, 'ceil')
    block.width = size[0]
    block.height = size[1]
  }
}
