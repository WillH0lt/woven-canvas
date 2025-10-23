import { BaseSystem } from '@infinitecanvas/core'
import { Block, Color, Edited, Opacity, Text } from '@infinitecanvas/core/components'
import { type Entity, co } from '@lastolivegames/becsy'
import figlet from 'figlet'
import standard from 'figlet/fonts/Standard'
import type { Mesh } from 'three'

import { Shape } from '../components'
import { showElement } from '../helpers/element'
import { resizeAndMaybeRecreateLetterMaterial } from '../helpers/materialHelper'
import { getLines } from '../helpers/textLayoutCalculator'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderScene } from './RenderScene'
import { RenderShapes } from './RenderShapes'

figlet.parseFont('Standard', standard)

export class RenderText extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly texts = this.query((q) =>
    q.added.addedOrChanged.current.with(Text, Block).trackWrites.without(Shape),
  )

  private readonly editedTexts = this.query((q) => q.added.removed.with(Text, Block, Edited).using(Opacity).write)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(RenderShapes).before(RenderScene))
  }

  // private async getTextLines(textEntity: Entity): Promise<string[]> {
  //   const { fontFamily } = textEntity.read(Text)
  //   const { tag, id } = textEntity.read(Block)

  //   let element = document.getElementById(id) as HTMLElement | null

  //   if (!element) {
  //     const blockDef = this.resources.blockDefs[tag]
  //     element = await showElement(textEntity, blockDef.components, this.resources.blockContainer, { opacity: 0 })
  //   }

  //   const textContainer = element?.shadowRoot?.firstElementChild as HTMLElement | null
  //   if (!textContainer) return []

  //   const lines = getLines(textContainer)
  //     .map((line) => line.text)
  //     .flatMap((line) => {
  //       if (fontFamily === 'Courier Prime Sans') {
  //         return [line]
  //       }

  //       return figlet
  //         .textSync(line, {
  //           font: fontFamily,
  //           horizontalLayout: 'full',
  //           verticalLayout: 'full',
  //         })
  //         .split('\n')
  //     })

  //   element.remove()

  //   return lines
  // }

  private getTextLines(textEntity: Entity, element: HTMLElement): string[] {
    const { fontFamily } = textEntity.read(Text)

    const textContainer = element?.shadowRoot?.firstElementChild as HTMLElement | null
    if (!textContainer) return []

    const lines = getLines(textContainer)
      .map((line) => line.text)
      .flatMap((line) => {
        if (fontFamily === 'Courier Prime Sans') {
          return [line]
        }

        return figlet
          .textSync(line, {
            font: fontFamily,
            horizontalLayout: 'full',
            verticalLayout: 'full',
          })
          .split('\n')
      })

    return lines
  }

  private updateMaterial(mesh: Mesh, lines: string[]): void {
    const width = mesh.scale.x
    const height = mesh.scale.y

    const rows = Math.round(height / this.grid.rowHeight)
    const cols = Math.round(width / this.grid.colWidth)

    resizeAndMaybeRecreateLetterMaterial(mesh, rows, cols)

    const material = mesh.material as LetterMaterial

    const black = new Color({
      red: 0,
      green: 0,
      blue: 0,
      alpha: 255,
    })

    // Fill the grid with characters from the split lines
    for (let row = 0; row < Math.min(rows, lines.length); row++) {
      const line = lines[row]

      for (let col = 0; col < Math.min(cols, line.length); col++) {
        const c = line[col]
        material.setCharAtPosition(c, row, col)
        material.setColorAtPosition(black, row, col)
      }
    }
  }

  // private async renderText(textEntity: Entity): Promise<void> {
  //   const { width, height, id } = textEntity.read(Block)

  //   const lines = await this.getTextLines(textEntity)

  //   const mesh = this.resources.scene.getObjectByName(id) as Mesh | undefined
  //   if (!mesh) return

  //   const rows = Math.round(height / this.grid.rowHeight)
  //   const cols = Math.round(width / this.grid.colWidth)

  //   resizeAndMaybeRecreateLetterMaterial(mesh, rows, cols)

  //   const material = mesh.material as LetterMaterial

  //   const chars = material.chars.value
  //   const black = new Color({
  //     red: 0,
  //     green: 0,
  //     blue: 0,
  //     alpha: 255,
  //   })

  //   // Fill the grid with characters from the split lines
  //   for (let row = 0; row < Math.min(rows, lines.length); row++) {
  //     const line = lines[row]

  //     for (let col = 0; col < Math.min(cols, line.length); col++) {
  //       const c = line[col]
  //       material.setCharAtPosition(c, row, col)
  //       material.setColorAtPosition(black, row, col)
  //     }
  //   }
  // }

  private async startEditingText(textEntity: Entity): Promise<void> {
    const { tag } = textEntity.read(Block)

    const blockDef = this.resources.blockDefs[tag]
    const element = await showElement(textEntity, blockDef.components, this.resources.blockContainer, { opacity: 1 })

    // add some styles for the text element
    element.style.backgroundColor = this.resources.fontData.backgroundColor
    element.style.outline = 'var(--ic-highlighted-block-outline-width) solid var(--ic-highlighted-block-outline-color)'
    element.style.borderRadius = 'var(--ic-highlighted-block-border-radius)'
    element.setAttribute('is-editing', 'true')
  }

  @co private *stopEditingText(textEntity: Entity): Generator {
    const { id } = textEntity.read(Block)

    const mesh = this.resources.scene.getObjectByName(id) as Mesh | undefined
    if (!mesh) return

    const element = document.getElementById(id) as HTMLElement | null
    if (!element) return

    const lines = this.getTextLines(textEntity, element)

    this.updateMaterial(mesh, lines)

    yield co.waitForFrames(1)

    element.remove()
    // yield co.waitForFrames(50)

    // const element = document.getElementById(id) as HTMLElement | null
    // if (element) {
    //   element.remove()
    // }
  }

  private async updateText(textEntity: Entity): Promise<void> {
    const { id, tag } = textEntity.read(Block)

    const mesh = this.resources.scene.getObjectByName(id) as Mesh | undefined
    if (!mesh) return

    const blockDef = this.resources.blockDefs[tag]
    const element = await showElement(textEntity, blockDef.components, this.resources.blockContainer, { opacity: 0 })

    const lines = this.getTextLines(textEntity, element)

    this.updateMaterial(mesh, lines)

    element.remove()
  }

  public execute(): void {
    for (const textEntity of this.editedTexts.added) {
      this.startEditingText(textEntity)
    }

    if (this.editedTexts.removed.length > 0) {
      this.accessRecentlyDeletedData()
    }
    for (const textEntity of this.editedTexts.removed) {
      this.stopEditingText(textEntity)
    }

    for (const textEntity of this.texts.addedOrChanged) {
      if (textEntity.has(Edited)) continue

      this.updateText(textEntity)
    }
  }
}
