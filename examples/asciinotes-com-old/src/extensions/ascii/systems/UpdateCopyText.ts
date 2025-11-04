import { LexoRank } from '@dalet-oss/lexorank'
import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import { Aabb, Block, Selected } from '@infinitecanvas/core/components'
import {} from '@infinitecanvas/extension-arrows'
import type { Mesh } from 'three'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { UpdateEnforceGrid } from './UpdateEnforceGrid'

export class UpdateCopyText extends BaseSystem<CoreCommandArgs> {
  protected declare readonly resources: AsciiResources

  private readonly selectedBlocks = this.query((q) => q.current.with(Block, Selected, Aabb))

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateEnforceGrid))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.Copy, this.copy.bind(this))
  }

  // extract the text and combine it into the clipboard
  public copy(): void {
    if (this.selectedBlocks.current.length === 0) return

    // calculate the bounding box of all selected blocks
    const aabb = new Aabb()
    for (let i = 0; i < this.selectedBlocks.current.length; i++) {
      const blockEntity = this.selectedBlocks.current[i]
      const block = blockEntity.read(Block)
      const blockAabb = block.computeAabb()
      if (i === 0) {
        aabb.copy(blockAabb)
      } else {
        aabb.expandByAabb(blockAabb)
      }
    }

    // sort by rank
    const sortedEntities = this.selectedBlocks.current.slice().sort((a, b) => {
      const rankA = a.read(Block).rank
      const rankB = b.read(Block).rank
      return LexoRank.parse(rankA).compareTo(LexoRank.parse(rankB))
    })

    // create the letter matrix
    const startCol = Math.floor(aabb.left / this.grid.colWidth)
    const endCol = Math.ceil(aabb.right / this.grid.colWidth)
    const startRow = Math.floor(aabb.top / this.grid.rowHeight)
    const endRow = Math.ceil(aabb.bottom / this.grid.rowHeight)

    const totalCols = endCol - startCol
    const totalRows = endRow - startRow

    const chars = new Uint32Array(totalCols * totalRows)

    // fill with spaces
    const space = this.resources.assets.unicodeMap.get(' '.charCodeAt(0)) ?? 32
    chars.fill(space)

    // combine the materials of each block into the letter matrix
    for (const blockEntity of sortedEntities) {
      const block = blockEntity.read(Block)
      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const blockAabb = block.computeAabb()
      const material = mesh.material as LetterMaterial
      const materialChars = material.chars.value
      const materialColors = material.colors.value

      const offsetCol = Math.round(blockAabb.left / this.grid.colWidth) - startCol
      const offsetRow = Math.round(blockAabb.top / this.grid.rowHeight) - startRow

      for (let row = 0; row < material.grid.value.y; row++) {
        const targetRow = row + offsetRow

        // Skip if row is out of bounds
        if (targetRow < 0 || targetRow >= totalRows) continue

        for (let col = 0; col < material.grid.value.x; col++) {
          const targetCol = col + offsetCol

          // Skip if column is out of bounds
          if (targetCol < 0 || targetCol >= totalCols) continue

          // Calculate indices with stride (1 for chars, 4 for RGBA colors)
          const sourceIndex = row * materialChars.image.width + col
          const targetIndex = targetRow * totalCols + targetCol

          // if the color is transparent, don't copy the character
          const alpha = materialColors.image.data[(row * materialChars.image.width + col) * 4 + 3]
          if (alpha !== 0) {
            chars[targetIndex] = materialChars.image.data[sourceIndex]
          }
        }
      }
    }

    // convert the letter matrix into lines of text
    const lines: string[] = []
    const unicodeMap = this.resources.assets.unicodeMap
    const unicodeEntries = [...unicodeMap.entries()]

    for (let row = 0; row < totalRows; row++) {
      let line = ''
      for (let col = 0; col < totalCols; col++) {
        const charIndex = chars[row * totalCols + col]
        const unicodeCharCode = unicodeEntries.find(([, v]) => v === charIndex)?.[0] ?? 32
        line += String.fromCharCode(unicodeCharCode)
      }
      lines.push(line)
    }

    // trim trailing spaces from each line
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].replace(/\s+$/, '')
    }

    // copy to clipboard
    const clipboardText = lines.join('\n')
    navigator.clipboard.writeText(clipboardText).then(
      () => {
        console.log('Text copied to clipboard')
      },
      (err) => {
        console.error('Could not copy text: ', err)
      },
    )
  }
}
