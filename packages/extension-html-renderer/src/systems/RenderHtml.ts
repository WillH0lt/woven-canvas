import { BaseSystem, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'

import type { BaseElement, ShapeElement } from '../elements'
import type { HtmlRendererResources } from '../types'

const RANK_ATTRIBUTE = 'data-ic-rank'

export class RenderHtml extends BaseSystem {
  protected declare readonly resources: HtmlRendererResources

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  private readonly blocks = this.query((q) => q.added.changed.removed.with(comps.Block).trackWrites)

  private readonly opacityBlocks = this.query(
    (q) => q.addedChangedOrRemoved.with(comps.Block).and.with(comps.Opacity).trackWrites,
  )

  public execute(): void {
    // update viewport
    if (this.cameras.changed.length > 0) {
      const camera = this.cameras.changed[0].read(comps.Camera)
      const viewport = this.resources.viewport
      viewport.style.transform = `translate(${-camera.left * camera.zoom}px, ${-camera.top * camera.zoom}px) scale(${camera.zoom})`
    }

    // render blocks
    let needsSorting = false
    for (const blockEntity of this.blocks.added) {
      const element = this.createBlockElement(blockEntity)
      this.updateBlockElementHtml(blockEntity, element)
      this.resources.viewport.appendChild(element)
      needsSorting = true
    }

    for (const blockEntity of this.blocks.changed) {
      const block = blockEntity.read(comps.Block)
      const element = this.resources.viewport.querySelector<HTMLElement>(`[id='${block.id}']`)
      if (!element) continue
      const rankUpdate = this.updateBlockElementHtml(blockEntity, element)
      needsSorting ||= rankUpdate
    }

    // block opacity
    for (const blockEntity of this.opacityBlocks.addedChangedOrRemoved) {
      if (!blockEntity.alive) continue
      const block = blockEntity.read(comps.Block)
      const element = this.resources.viewport.querySelector<HTMLElement>(`[id='${block.id}']`)
      if (!element) continue
      this.updateOpacityBlockHtml(blockEntity, element)
    }

    // // shapes
    // for (const shapeEntity of this.shapes.addedOrChanged) {
    //   const block = shapeEntity.read(comps.Block)
    //   const element = this.resources.viewport.querySelector<ShapeElement>(`[id='${block.id}']`)
    //   if (element) {
    //     this.updateShapeElementHtml(shapeEntity, element)
    //   }
    // }

    // // texts
    // for (const textEntity of this.texts.addedOrChanged) {
    //   const block = textEntity.read(comps.Block)
    //   const element = this.resources.viewport.querySelector<TextElement>(`[id='${block.id}']`)
    //   if (element) {
    //     this.updateTextElementHtml(textEntity, element)
    //   }
    // }

    // remove blocks
    if (this.blocks.removed.length > 0) {
      this.accessRecentlyDeletedData()
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(comps.Block)
      const element = this.resources.viewport.querySelector<HTMLElement>(`[id='${block.id}']`)
      if (!element) continue
      this.resources.viewport.removeChild(element)
    }

    if (needsSorting) {
      this.sortElementsByRank()
    }
  }

  private sortElementsByRank(): void {
    const elements = Array.from(this.resources.viewport.children) as HTMLElement[]
    const rankCache = new Map<HTMLElement, LexoRank>()

    for (const element of elements) {
      const rankStr = element.getAttribute(RANK_ATTRIBUTE) || '0'
      rankCache.set(element, LexoRank.parse(rankStr))
    }

    elements.sort((a, b) => {
      const rankA = rankCache.get(a)!
      const rankB = rankCache.get(b)!
      return rankA.compareTo(rankB)
    })

    for (let i = 0; i < elements.length; i++) {
      elements[i].style.zIndex = `${i}`
    }
  }

  private createBlockElement(entity: Entity): BaseElement {
    const block = entity.read(comps.Block)
    const element = document.createElement(block.kind) as BaseElement
    element.id = block.id
    element.blockId = block.id
    element.setAttribute(RANK_ATTRIBUTE, block.rank)

    return element
  }

  private updateBlockElementHtml(entity: Entity, element: HTMLElement): boolean {
    const block = entity.read(comps.Block)

    element.style.position = 'absolute'
    element.style.userSelect = 'none'
    element.style.pointerEvents = 'none'
    element.style.display = 'block'

    element.style.left = `${block.left}px`
    element.style.top = `${block.top}px`
    element.style.width = `${block.width}px`
    element.style.height = `${block.height}px`
    element.style.transform = `rotateZ(${block.rotateZ}rad)`

    const rank = element.getAttribute(RANK_ATTRIBUTE)
    const rankUpdate = rank !== block.rank

    element.setAttribute(RANK_ATTRIBUTE, block.rank)

    return rankUpdate
  }

  private updateOpacityBlockHtml(entity: Entity, element: HTMLElement): void {
    let opacity = 1
    if (entity.has(comps.Opacity)) {
      opacity = entity.read(comps.Opacity).value / 255
    }
    element.style.opacity = `${opacity}`
  }

  private updateShapeElementHtml(entity: Entity, element: ShapeElement): void {
    const shape = entity.read(comps.Shape)
    element.style.backgroundColor = `rgba(${shape.red}, ${shape.green}, ${shape.blue}, ${shape.alpha / 255})`
  }
}
