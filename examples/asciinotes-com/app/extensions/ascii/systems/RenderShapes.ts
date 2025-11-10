import { BaseSystem } from '@infinitecanvas/core'
import { Block, Color } from '@infinitecanvas/core/components'
import type { Mesh } from 'three'

import { Shape } from '../components'
import { resizeAndMaybeRecreateLetterMaterial } from '../helpers/materialHelper'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderScene } from './RenderScene'

export class RenderShapes extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly shapes = this.query((q) => q.addedOrChanged.current.with(Shape, Block, Color).trackWrites)

  public constructor() {
    super()
    this.schedule((s) => s.before(RenderScene))
  }

  public execute(): void {
    for (const shapeEntity of this.shapes.addedOrChanged) {
      const block = shapeEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const rows = Math.round(block.height / this.grid.rowHeight)
      const cols = Math.round(block.width / this.grid.colWidth)

      resizeAndMaybeRecreateLetterMaterial(mesh, rows, cols)

      const material = mesh.material as LetterMaterial

      const chars = material.chars.value
      const colors = material.colors.value

      const shape = shapeEntity.read(Shape)

      const style = this.resources.shapeStyles.find((s) => s.key === shape.style) ?? this.resources.shapeStyles[0]

      // const horizontalEdge = style.horizontalChar
      // const verticalEdge = style.verticalChar
      // const corner = style.topLeftCornerChar
      const clearColor = new Color({ red: 0, green: 0, blue: 0, alpha: 0 })

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const atTop = row === 0
          const atBottom = row === rows - 1
          const atLeft = col === 0
          const atRight = col === cols - 1

          let char: string
          let color = shapeEntity.read(Color)
          if (atTop && atLeft) {
            char = style.topLeftCornerChar
          } else if (atTop && atRight) {
            char = style.topRightCornerChar
          } else if (atBottom && atLeft) {
            char = style.bottomLeftCornerChar
          } else if (atBottom && atRight) {
            char = style.bottomRightCornerChar
          } else if (atTop || atBottom) {
            char = style.horizontalChar
          } else if (atLeft || atRight) {
            char = style.verticalChar
          } else {
            char = ' '
            color = clearColor
          }

          material.setCharAtPosition(char, row, col)
          material.setColorAtPosition(color, row, col)
        }
      }
      chars.needsUpdate = true
      colors.needsUpdate = true
    }
  }
}
