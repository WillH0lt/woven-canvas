import { BaseSystem } from '@infinitecanvas/core'
import { Block } from '@infinitecanvas/core/components'
import type { Mesh } from 'three'

import { Shape } from '../components'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'

export class PreRenderShapes extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly shapes = this.query((q) => q.addedOrChanged.current.with(Shape, Block).trackWrites)

  public execute(): void {
    for (const shapeEntity of this.shapes.addedOrChanged) {
      const block = shapeEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const material = mesh.material as LetterMaterial

      const chars = material.chars.value

      const horizontalEdge = this.resources.assets.unicodeMap.get('-'.charCodeAt(0)) || 0
      const verticalEdge = this.resources.assets.unicodeMap.get('|'.charCodeAt(0)) || 0
      const corner = this.resources.assets.unicodeMap.get('+'.charCodeAt(0)) || 0
      const fill = this.resources.assets.unicodeMap.get(' '.charCodeAt(0)) || 0

      const rows = Math.round(block.height / this.grid.rowHeight)
      const cols = Math.round(block.width / this.grid.colWidth)

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
        }
      }

      chars.needsUpdate = true
    }
  }
}
