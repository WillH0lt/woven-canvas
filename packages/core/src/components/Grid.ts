import { component, field } from '@lastolivegames/becsy'
import type { Block } from './Block'

@component
export class Grid {
  @field.boolean public declare enabled: boolean
  @field.float64 public declare colWidth: number
  @field.float64 public declare rowHeight: number

  public snapToGrid(position: [number, number]): void {
    if (!this.enabled) {
      return
    }

    position[0] = Math.round(position[0] / this.colWidth) * this.colWidth
    position[1] = Math.round(position[1] / this.rowHeight) * this.rowHeight
  }

  public snapBlockPositionToGrid(block: Block): void {
    const position: [number, number] = [block.left, block.top]
    this.snapToGrid(position)
    block.left = position[0]
    block.top = position[1]
  }
}
