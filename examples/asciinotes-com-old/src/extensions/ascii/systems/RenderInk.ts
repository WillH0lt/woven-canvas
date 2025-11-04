import { BaseSystem } from '@infinitecanvas/core'
import { Block, Color } from '@infinitecanvas/core/components'
import { Stroke } from '@infinitecanvas/extension-ink'
import type { Mesh } from 'three'
import { resizeAndMaybeRecreateLetterMaterial } from '../helpers/materialHelper'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderArrows } from './RenderArrows'
import { RenderScene } from './RenderScene'
import { RenderShapes } from './RenderShapes'
import { RenderText } from './RenderText'

export class RenderInk extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly strokes = this.query((q) => q.addedOrChanged.current.with(Stroke, Block, Color).trackWrites)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(RenderArrows, RenderShapes, RenderText).before(RenderScene))
  }

  public execute(): void {
    for (const strokeEntity of this.strokes.addedOrChanged) {
      const block = strokeEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const rows = Math.round(block.height / this.grid.rowHeight)
      const cols = Math.round(block.width / this.grid.colWidth)

      resizeAndMaybeRecreateLetterMaterial(mesh, rows, cols)

      const material = mesh.material as LetterMaterial

      const colors = material.colors.value

      const stroke = strokeEntity.read(Stroke)

      // const color = new Color({ red: 0, green: 0, blue: 0, alpha: 255 })
      const color = strokeEntity.read(Color)

      colors.image.data.fill(0)

      const originalPosition: [number, number] = [stroke.originalLeft, stroke.originalTop]
      this.grid.snapToGrid(originalPosition)
      const originalSize: [number, number] = [stroke.originalWidth, stroke.originalHeight]
      this.grid.snapToGrid(originalSize)

      // Process line segments between consecutive points
      for (let i = 0; i < stroke.pointCount - 1; i++) {
        const x1 = stroke.points[i * 2]
        const y1 = stroke.points[i * 2 + 1]
        const x2 = stroke.points[(i + 1) * 2]
        const y2 = stroke.points[(i + 1) * 2 + 1]

        // Get intersecting cells for this line segment
        const intersectingCells = this.getIntersectingCells(
          [x1, y1],
          [x2, y2],
          originalPosition,
          originalSize,
          rows,
          cols,
        )

        for (let cellIndex = 0; cellIndex < intersectingCells.length; cellIndex++) {
          const [row, col] = intersectingCells[cellIndex]
          if (row >= 0 && row < rows && col >= 0 && col < cols) {
            material.setCharAtPosition('#', row, col)
            material.setColorAtPosition(color, row, col)
          }
        }
      }
    }
  }

  private getIntersectingCells(
    startPoint: [number, number],
    endPoint: [number, number],
    originalPosition: [number, number],
    originalSize: [number, number],
    rows: number,
    cols: number,
  ): [number, number][] {
    // Safety checks
    if (originalSize[0] <= 0 || originalSize[1] <= 0 || rows <= 0 || cols <= 0) {
      return []
    }

    // Convert world coordinates to normalized coordinates (0-1)
    const normalizeX = (x: number) => (x - originalPosition[0]) / originalSize[0]
    const normalizeY = (y: number) => (y - originalPosition[1]) / originalSize[1]

    const x1 = normalizeX(startPoint[0])
    const y1 = normalizeY(startPoint[1])
    const x2 = normalizeX(endPoint[0])
    const y2 = normalizeY(endPoint[1])

    // Convert to grid coordinates and clamp to valid bounds
    const gridX1 = Math.max(0, Math.min(cols - 1, Math.floor(x1 * cols)))
    const gridY1 = Math.max(0, Math.min(rows - 1, Math.floor(y1 * rows)))
    const gridX2 = Math.max(0, Math.min(cols - 1, Math.floor(x2 * cols)))
    const gridY2 = Math.max(0, Math.min(rows - 1, Math.floor(y2 * rows)))

    // If both points are in the same cell, just return that cell
    if (gridX1 === gridX2 && gridY1 === gridY2) {
      return [[gridY1, gridX1]] // [row, col]
    }

    // Use Bresenham's line algorithm to find all cells intersected by the line
    const cells2D = this.bresenhamLine(gridX1, gridY1, gridX2, gridY2)

    // Convert to [row, col] format and remove duplicates
    const cellSet = new Set<string>()
    const cells: [number, number][] = []

    for (const [x, y] of cells2D) {
      const key = `${y},${x}`
      if (!cellSet.has(key)) {
        cellSet.add(key)
        cells.push([y, x]) // Note: row = y, col = x
      }
    }

    return cells
  }

  private bresenhamLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
    const points: [number, number][] = []

    // Safety check for same point
    if (x0 === x1 && y0 === y1) {
      return [[x0, y0]]
    }

    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy

    let x = x0
    let y = y0

    // Safety counter to prevent infinite loops
    const maxIterations = Math.max(dx, dy) + 1
    let iterations = 0

    while (iterations < maxIterations) {
      points.push([x, y])

      if (x === x1 && y === y1) break

      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }

      iterations++
    }

    return points
  }
}
