import { BaseSystem } from '@infinitecanvas/core'
import { Block, Color, Selected } from '@infinitecanvas/core/components'
import {
  ArrowCommand,
  type ArrowCommandArgs,
  ArrowHeadKind,
  ArrowTrim,
  ElbowArrow,
} from '@infinitecanvas/extension-arrows'
import type { Entity } from '@lastolivegames/becsy'
import type { Mesh } from 'three'

import { resizeAndMaybeRecreateLetterMaterial } from '../helpers/materialHelper'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderScene } from './RenderScene'
import { RenderShapes } from './RenderShapes'
import { RenderText } from './RenderText'

export class RenderArrows extends BaseSystem<ArrowCommandArgs> {
  protected declare readonly resources: AsciiResources

  private readonly arrows = this.query(
    (q) => q.addedOrChanged.with(ElbowArrow, Block, Color).trackWrites.using(Selected, ArrowTrim).read,
  )

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(RenderShapes, RenderText).before(RenderScene))
  }

  public initialize(): void {
    this.addCommandListener(ArrowCommand.ShowTransformHandles, this.showTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.HideTransformHandles, this.hideTransformHandles.bind(this))
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

      const colors = material.colors.value
      colors.image.data.fill(0)

      this.drawLines(arrowEntity, material)
    }
  }

  private drawLines(arrowEntity: Entity, material: LetterMaterial): void {
    const horizontalEdge = '-'
    const verticalEdge = '|'
    const corner = '+'

    const color = arrowEntity.read(Color)
    const elbowArrow = arrowEntity.read(ElbowArrow)

    for (let i = 1; i < elbowArrow.pointCount; i++) {
      let start = elbowArrow.getPoint(i - 1)
      let end = elbowArrow.getPoint(i)

      const isStartSegment = i === 1
      const isEndSegment = i === elbowArrow.pointCount - 1

      if (isStartSegment) {
        const arrowTrim = arrowEntity.read(ArrowTrim)
        start = this.trimVec(start, end, arrowTrim.tStart)
      }
      if (isEndSegment) {
        const arrowTrim = arrowEntity.read(ArrowTrim)
        end = this.trimVec(end, start, 1 - arrowTrim.tEnd)
      }

      const [startCol, startRow] = material.uvToColRow(start)
      const [endCol, endRow] = material.uvToColRow(end)

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

      if (i === 1 && elbowArrow.startArrowHead !== ArrowHeadKind.None) {
        this.drawArrowHead(start, end, color, elbowArrow.startArrowHead, material, -1)
      }
      if (i === elbowArrow.pointCount - 1 && elbowArrow.endArrowHead !== ArrowHeadKind.None) {
        this.drawArrowHead(end, start, color, elbowArrow.endArrowHead, material, 1)
      }
    }
  }

  // private applyArrowTrim(
  //   arrowEntity: Entity,
  //   elbowArrow: ElbowArrow,
  //   segmentIndex: number,
  //   startCol: number,
  //   startRow: number,
  //   endCol: number,
  //   endRow: number,
  // ): { startCol: number; startRow: number; endCol: number; endRow: number } {
  //   let trimmedStartCol = startCol
  //   let trimmedStartRow = startRow
  //   let trimmedEndCol = endCol
  //   let trimmedEndRow = endRow

  //   if (segmentIndex === 1) {
  //     const arrowTrim = arrowEntity.read(ArrowTrim)
  //     trimmedStartCol += (endCol - startCol) * arrowTrim.tStart
  //     trimmedStartRow += (endRow - startRow) * arrowTrim.tStart

  //     trimmedStartCol = Math.floor(trimmedStartCol)
  //     trimmedStartRow = Math.floor(trimmedStartRow)
  //   }

  //   if (segmentIndex === elbowArrow.pointCount - 1) {
  //     const arrowTrim = arrowEntity.read(ArrowTrim)
  //     trimmedEndCol -= (endCol - startCol) * (1 - arrowTrim.tEnd)
  //     trimmedEndRow -= (endRow - startRow) * (1 - arrowTrim.tEnd)

  //     trimmedEndCol = Math.ceil(trimmedEndCol)
  //     trimmedEndRow = Math.ceil(trimmedEndRow)
  //   }

  //   return {
  //     startCol: trimmedStartCol,
  //     startRow: trimmedStartRow,
  //     endCol: trimmedEndCol,
  //     endRow: trimmedEndRow,
  //   }
  // }

  private trimVec(start: [number, number], end: [number, number], trim: number): [number, number] {
    const dir = [end[0] - start[0], end[1] - start[1]]
    return [start[0] + dir[0] * trim, start[1] + dir[1] * trim]
  }

  private drawArrowHead(
    start: [number, number],
    end: [number, number],
    color: Color,
    kind: ArrowHeadKind,
    material: LetterMaterial,
    sign: 1 | -1,
  ): void {
    if (kind !== ArrowHeadKind.V) return

    const [tipCol, tipRow] = material.uvToColRow(start)

    // Calculate direction vector from end to start (pointing towards the arrow tip)
    const dirX = start[0] - end[0]
    const dirY = start[1] - end[1]
    const length = Math.sqrt(dirX * dirX + dirY * dirY)

    if (length === 0) return

    // Normalize direction
    const normalizedDirX = dirX / length
    const normalizedDirY = dirY / length

    // Determine if arrow is primarily horizontal or vertical
    const isHorizontal = Math.abs(normalizedDirX) > Math.abs(normalizedDirY)

    if (isHorizontal) {
      // Horizontal arrow head
      const arrowChar = normalizedDirX * sign > 0 ? '>' : '<'
      // if (arrowChar === '<') {
      //   tipCol += 1
      // }

      material.setCharAtPosition(arrowChar, tipRow, tipCol)
      material.setColorAtPosition(color, tipRow, tipCol)
    } else {
      // Vertical arrow head
      const arrowChar = normalizedDirY * sign > 0 ? 'v' : '^'
      material.setCharAtPosition(arrowChar, tipRow, tipCol)
      material.setColorAtPosition(color, tipRow, tipCol)
    }
  }

  public showTransformHandles(): void {
    console.log('Show arrow transform handles called')
  }

  public hideTransformHandles(): void {
    console.log('Hide arrow transform handles called')
  }
}
