import type { Entity, Query } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'

import type { BaseComponent } from '../BaseComponent'
import { BaseSystem } from '../BaseSystem'
import { ComponentRegistry } from '../ComponentRegistry'
import * as comps from '../components'
import { binarySearchForId, lowercaseFirstLetter } from '../helpers'
import { uuidToNumber } from '../helpers/uuidToNumber'
import type { CoreResources } from '../types'
import type { ICBaseBlock } from '../webComponents'

const RANK_ATTRIBUTE = 'data-ic-rank'

function updateCssProperty(property: string, value: string): void {
  const style = document.documentElement.style
  const currentValue = style.getPropertyValue(property)
  if (currentValue !== value) {
    style.setProperty(property, value)
  }
}

export class RenderHtml extends BaseSystem {
  private readonly currentQueries = new Map<new () => BaseComponent, Query>()

  private readonly changedQueries = new Map<new () => BaseComponent, Query>()

  protected declare readonly resources: CoreResources

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  private readonly blocks = this.query((q) => q.added.changed.removed.with(comps.Block).trackWrites)

  private readonly opacityBlocks = this.query(
    (q) => q.addedChangedOrRemoved.with(comps.Block).and.with(comps.Opacity).trackWrites,
  )

  private readonly selectedBlocks = this.query((q) => q.added.removed.with(comps.Block, comps.Selected))

  private readonly hoveredBlocks = this.query((q) => q.added.removed.with(comps.Block, comps.Hovered))

  public constructor() {
    super()

    const Components = ComponentRegistry.instance.components
    for (const Comp of Components) {
      const current = this.query((q) =>
        q.current.with(comps.Block, Comp).orderBy((e) => uuidToNumber(e.read(comps.Block).id)),
      )
      this.currentQueries.set(Comp, current)

      const changedQuery = this.query((q) => q.changed.with(comps.Block).and.with(Comp).trackWrites)
      this.changedQueries.set(Comp, changedQuery)
    }
  }

  public execute(): void {
    // update viewport
    if (this.cameras.changed.length > 0) {
      const camera = this.cameras.changed[0].read(comps.Camera)
      const blockContainer = this.resources.blockContainer
      blockContainer.style.transform = `translate(${-camera.left * camera.zoom}px, ${-camera.top * camera.zoom}px) scale(${camera.zoom})`

      updateCssProperty('--ic-zoom', `${camera.zoom}`)
    }

    // ========================================================
    // render blocks
    let needsSorting = false
    for (const blockEntity of this.blocks.added) {
      const element = this.createBlockElement(blockEntity)
      this.updateBlockElementHtml(blockEntity, element)
      this.resources.blockContainer.appendChild(element)
      needsSorting = true
    }

    for (const blockEntity of this.blocks.changed) {
      const block = blockEntity.read(comps.Block)
      const element = this.getBlockElementById(block.id)
      if (!element) continue
      const rankUpdate = this.updateBlockElementHtml(blockEntity, element)
      needsSorting ||= rankUpdate
    }

    for (const Comp of this.changedQueries.keys()) {
      const query = this.changedQueries.get(Comp)!
      if (query.changed.length === 0) continue

      for (const entity of query.changed) {
        const blockId = entity.read(comps.Block).id
        const element = this.getBlockElementById(blockId)
        if (!element) continue

        this.updateElementComponentAttribute(element, entity, Comp)
      }
    }

    // ========================================================
    // block opacity
    for (const blockEntity of this.opacityBlocks.addedChangedOrRemoved) {
      if (!blockEntity.alive) continue
      const block = blockEntity.read(comps.Block)
      const element = this.getBlockElementById(block.id)
      if (!element) continue
      this.updateOpacityBlockHtml(blockEntity, element)
    }

    // ========================================================
    // selected blocks
    for (const blockEntity of this.selectedBlocks.added) {
      const block = blockEntity.read(comps.Block)
      const element = this.getBlockElementById(block.id)
      if (!element) continue
      element.setAttribute('is-selected', 'true')
    }

    for (const blockEntity of this.selectedBlocks.removed) {
      if (!blockEntity.alive) continue
      const block = blockEntity.read(comps.Block)
      const element = this.getBlockElementById(block.id)
      if (!element) continue
      element.removeAttribute('is-selected')
    }

    // ========================================================
    // hovered blocks
    for (const blockEntity of this.hoveredBlocks.added) {
      const block = blockEntity.read(comps.Block)
      const element = this.getBlockElementById(block.id)
      if (!element) continue
      element.setAttribute('is-hovered', 'true')
    }

    for (const blockEntity of this.hoveredBlocks.removed) {
      if (!blockEntity.alive) continue
      const block = blockEntity.read(comps.Block)
      const element = this.getBlockElementById(block.id)
      if (!element) continue
      element.removeAttribute('is-hovered')
    }

    // ========================================================
    // remove blocks
    if (this.blocks.removed.length > 0) {
      this.accessRecentlyDeletedData()
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(comps.Block)
      const element = this.getBlockElementById(block.id)
      if (!element) continue
      this.resources.blockContainer.removeChild(element)
    }

    if (needsSorting) {
      this.sortElementsByRank()
    }
  }

  private sortElementsByRank(): void {
    const elements = Array.from(this.resources.blockContainer.children) as HTMLElement[]
    const rankCache = new Map<HTMLElement, LexoRank>()

    for (const element of elements) {
      const rankStr = element.getAttribute(RANK_ATTRIBUTE)
      if (!rankStr) continue
      rankCache.set(element, LexoRank.parse(rankStr))
    }

    elements.sort((a, b) => {
      const rankA = rankCache.get(a)
      const rankB = rankCache.get(b)

      if (!rankA || !rankB) return 0

      return rankA.compareTo(rankB)
    })

    for (let i = 0; i < elements.length; i++) {
      elements[i].style.zIndex = `${i}`
    }
  }

  private createBlockElement(entity: Entity): ICBaseBlock {
    const block = entity.read(comps.Block)
    const element = document.createElement(block.tag) as ICBaseBlock
    const blockId = block.id
    element.id = blockId
    element.blockId = blockId
    // element.block = block
    element.setAttribute(RANK_ATTRIBUTE, block.rank)

    const blockDef = this.resources.blockDefs[block.tag]
    if (blockDef) {
      for (const Comp of blockDef.components) {
        const entities = this.currentQueries.get(Comp)?.current
        if (!entities) continue

        const entity = binarySearchForId(comps.Block, blockId, entities)
        if (!entity) continue

        this.updateElementComponentAttribute(element, entity, Comp)
      }
    }

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

  private updateElementComponentAttribute(element: HTMLElement, entity: Entity, Comp: new () => BaseComponent): void {
    const value = entity.read(Comp)
    const name = lowercaseFirstLetter(Comp.name)

    // @ts-ignore
    ;(element as any)[name] = new Comp(value.toJson())
  }
}
