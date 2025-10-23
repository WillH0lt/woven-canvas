import { BaseSystem } from '@infinitecanvas/core'
import { Block, Color } from '@infinitecanvas/core/components'
import { ElbowArrow } from '@infinitecanvas/extension-arc-arrows'
import type { Mesh } from 'three'

import { resizeAndMaybeRecreateLetterMaterial } from '../helpers/materialHelper'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderScene } from './RenderScene'
import { RenderShapes } from './RenderShapes'
import { RenderText } from './RenderText'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export class RenderArrows extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly arrows = this.query((q) => q.addedOrChanged.with(ElbowArrow, Block, Color).trackWrites)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(RenderShapes, RenderText).before(RenderScene))
  }
  public execute(): void {
    for (const arrowEntity of this.arrows.addedOrChanged) {
      const block = arrowEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const cols = Math.round(block.width / this.grid.colWidth)
      const rows = Math.round(block.height / this.grid.rowHeight)

      resizeAndMaybeRecreateLetterMaterial(mesh, rows, cols)

      const material = mesh.material as LetterMaterial

      const chars = material.chars.value
      const colors = material.colors.value
      colors.image.data.fill(0)

      const horizontalEdge = '-'
      const verticalEdge = '|'
      const corner = '+'
      const color = arrowEntity.read(Color)

      const elbowArrow = arrowEntity.read(ElbowArrow)

      for (let i = 1; i < elbowArrow.pointCount; i++) {
        const start = elbowArrow.getPoint(i - 1)
        const end = elbowArrow.getPoint(i)

        const startRow = clamp(Math.round(start[1] * rows), 0, rows - 1)
        const startCol = clamp(Math.round(start[0] * cols), 0, cols - 1)
        const endRow = clamp(Math.round(end[1] * rows), 0, rows - 1)
        const endCol = clamp(Math.round(end[0] * cols), 0, cols - 1)

        if (startRow === endRow) {
          // Horizontal line
          const row = startRow
          const colStart = Math.min(startCol, endCol)
          const colEnd = Math.max(startCol, endCol)

          for (let col = colStart; col <= colEnd; col++) {
            let char = horizontalEdge
            if (col === colStart || col === colEnd) {
              char = corner
            }
            material.setCharAtPosition(char, row, col)
            material.setColorAtPosition(color, row, col)
          }
        } else if (startCol === endCol) {
          // Vertical line
          const col = startCol
          const rowStart = Math.min(startRow, endRow)
          const rowEnd = Math.max(startRow, endRow)

          for (let row = rowStart; row <= rowEnd; row++) {
            let char = verticalEdge
            if (row === rowStart || row === rowEnd) {
              char = corner
            }
            material.setCharAtPosition(char, row, col)
            material.setColorAtPosition(color, row, col)
          }
        }
      }

      // for (let row = 0; row < rows; row++) {
      //   for (let col = 0; col < cols; col++) {
      //     let charCode = fill

      //     const atTop = row === 0
      //     const atBottom = row === rows - 1
      //     const atLeft = col === 0
      //     const atRight = col === cols - 1

      //     if ((atTop && atLeft) || (atTop && atRight) || (atBottom && atLeft) || (atBottom && atRight)) {
      //       charCode = corner
      //     } else if (atTop || atBottom) {
      //       charCode = horizontalEdge
      //     } else if (atLeft || atRight) {
      //       charCode = verticalEdge
      //     }

      //     chars.image.data[row * chars.image.width + col] = charCode
      //   }
      // }
      chars.needsUpdate = true
      // colors.needsUpdate = true
    }
  }
}
