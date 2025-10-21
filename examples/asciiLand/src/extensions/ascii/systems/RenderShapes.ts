import { BaseSystem } from '@infinitecanvas/core'
import { Block, Text } from '@infinitecanvas/core/components'
import type { Mesh } from 'three'

import { Shape } from '../components'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderScene } from './RenderScene'

export class RenderShapes extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly shapes = this.query((q) => q.addedOrChanged.current.with(Shape, Text, Block).trackWrites)

  public constructor() {
    super()
    this.schedule((s) => s.before(RenderScene))
  }

  public execute(): void {
    for (const shapeEntity of this.shapes.addedOrChanged) {
      const block = shapeEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const material = mesh.material as LetterMaterial

      const rows = Math.round(block.height / this.grid.rowHeight)
      const cols = Math.round(block.width / this.grid.colWidth)

      const grid = material.grid.value
      if (grid.x === cols && grid.y === rows) {
        continue
      }

      grid.x = cols
      grid.y = rows

      const chars = material.chars.value
      // const colors = material.colors.value

      const horizontalEdge = this.resources.assets.unicodeMap.get('-'.charCodeAt(0)) || 0
      const verticalEdge = this.resources.assets.unicodeMap.get('|'.charCodeAt(0)) || 0
      const corner = this.resources.assets.unicodeMap.get('+'.charCodeAt(0)) || 0
      const fill = this.resources.assets.unicodeMap.get(' '.charCodeAt(0)) || 0

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let charCode = fill

          const atTop = row === 0
          const atBottom = row === rows - 1
          const atLeft = col === 0
          const atRight = col === cols - 1

          if ((atTop && atLeft) || (atTop && atRight) || (atBottom && atLeft) || (atBottom && atRight)) {
            charCode = corner
          } else if (atTop || atBottom) {
            charCode = horizontalEdge
          } else if (atLeft || atRight) {
            charCode = verticalEdge
          }

          chars.image.data[row * chars.image.width + col] = charCode

          // colors.image.data[row * colors.image.width + col] = shapeEntity.read(Shape).color
        }
      }
      chars.needsUpdate = true
      // colors.needsUpdate = true
    }
  }
}
