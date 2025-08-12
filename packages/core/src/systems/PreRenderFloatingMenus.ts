import type { Entity, Query } from '@lastolivegames/becsy'

import type { BaseComponent } from '../BaseComponent'
import { BaseSystem } from '../BaseSystem'
import { ComponentRegistry } from '../ComponentRegistry'
import { SnapshotBuilder } from '../History'
import * as comps from '../components'
import type { FloatingMenuElement } from '../elements'
import { binarySearchForId, clamp, computeExtents, uuidToNumber } from '../helpers'
import { PointerButton } from '../types'
import type { CoreResources } from '../types'

export class PreRenderFloatingMenus extends BaseSystem {
  protected declare readonly resources: CoreResources

  private readonly currentQueries = new Map<new () => BaseComponent, Query>()

  private readonly changedQueries = new Map<new () => BaseComponent, Query>()

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly screen = this.singleton.read(comps.Screen)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly selectedBlocks = this.query(
    (q) => q.addedChangedOrRemoved.current.with(comps.Selected).with(comps.Block).trackWrites.using(comps.Aabb).read,
  )

  private readonly editedBlocks = this.query((q) => q.current.with(comps.Edited))

  private readonly pointers = this.query((q) => q.added.removed.changed.current.with(comps.Pointer).read.trackWrites)

  public constructor() {
    super()

    const Components = ComponentRegistry.instance.components
    for (const Comp of Components) {
      const current = this.query((q) =>
        q.current.with(comps.Block, Comp).orderBy((e) => uuidToNumber(e.read(comps.Block).id)),
      )
      this.currentQueries.set(Comp, current)

      const changedQuery = this.query((q) => q.changed.with(comps.Block, comps.Selected).and.with(Comp).trackWrites)
      this.changedQueries.set(Comp, changedQuery)
    }
  }

  public execute(): void {
    if (this.cameras.changed.length > 0) {
      const element = this.resources.menuContainer.querySelector('ic-floating-menu')
      if (element) {
        this.updateMenuPosition(element)
      }
    }

    const pointerEvents = this.getPointerEvents(this.pointers, this.camera, this.intersect, {
      button: PointerButton.Left,
    })
    if (pointerEvents.find((e) => e.type === 'pointerDown') && this.editedBlocks.current.length === 0) {
      this.removeFloatingMenuElement()
    }

    if (this.pointers.current.length === 0) {
      if (this.selectedBlocks.addedChangedOrRemoved.length > 0 || pointerEvents.find((e) => e.type === 'pointerUp')) {
        this.createOrUpdateFloatingMenuElement()
      }
    }

    if (this.selectedBlocks.current.length > 0) {
      const blocks = new Map<string, string>()

      for (const Comp of this.changedQueries.keys()) {
        const query = this.changedQueries.get(Comp)!
        if (query.changed.length === 0) continue

        for (const entity of query.changed) {
          const block = entity.read(comps.Block)
          blocks.set(block.id, block.tag)
        }
      }

      if (blocks.size > 0) {
        const floatingMenuElement = this.resources.menuContainer.querySelector('ic-floating-menu')
        if (floatingMenuElement) {
          for (const [id, tag] of blocks) {
            this.updateSnapshotAttribute(floatingMenuElement, id, tag)
          }
        }
      }
    }
  }

  createOrUpdateFloatingMenuElement(): void {
    const mySelectedBlocks = this.selectedBlocks.current.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    )

    if (mySelectedBlocks.length === 0) {
      this.removeFloatingMenuElement()
      return
    }

    let tag = 'group'
    let blockId = ''
    let singularSelectedEntity: Entity | undefined = undefined
    if (mySelectedBlocks.length === 1) {
      const block = mySelectedBlocks[0].read(comps.Block)
      tag = block.tag
      blockId = block.id
      singularSelectedEntity = mySelectedBlocks[0]
    }

    const blockDef = this.getBlockDef(tag)
    let buttons = blockDef?.floatingMenu ?? []
    if (singularSelectedEntity?.has(comps.Edited)) {
      buttons = blockDef?.editedFloatingMenu ?? []
    }

    let element = this.resources.menuContainer.querySelector('ic-floating-menu')
    if (!element) {
      element = document.createElement('ic-floating-menu')
      this.resources.menuContainer.appendChild(element)
    }

    element.buttons = buttons
    element.blockId = blockId

    this.updateSnapshotAttribute(element, blockId, tag)

    const width = element.buttons.reduce((acc, button) => acc + button.width, 0)
    const height = 40

    element.style.position = 'absolute'
    element.style.pointerEvents = 'auto'
    element.style.width = `${width}px`
    element.style.height = `${height}px`
    element.requestUpdate()

    this.updateMenuPosition(element)
  }

  private updateSnapshotAttribute(element: FloatingMenuElement, blockId: string, tag: string): void {
    const blockDef = this.getBlockDef(tag)
    if (!blockDef) return

    const snapshotBuilder = new SnapshotBuilder()
    for (const Comp of blockDef.components) {
      const entities = this.currentQueries.get(Comp)?.current
      if (!entities) continue

      const entity = binarySearchForId(comps.Block, blockId, entities)
      if (!entity) continue

      snapshotBuilder.putComponent(blockId, Comp.name, entity.read(Comp).toJson())
    }

    element.snapshot = snapshotBuilder.snapshot
  }

  private removeFloatingMenuElement(): void {
    const element = this.resources.menuContainer.querySelector('ic-floating-menu')
    element?.remove()
  }

  private updateMenuPosition(element: FloatingMenuElement): void {
    const rect = element.getBoundingClientRect()

    const menuWidth = rect.width / this.camera.zoom
    const menuHeight = rect.height / this.camera.zoom

    const offset = 12 / this.camera.zoom
    const padding = 4 / this.camera.zoom

    const extents = computeExtents(this.selectedBlocks.current)
    const centerX = (extents.left + extents.right) / 2

    let left = this.camera.zoom * (centerX - menuWidth / 2 - this.camera.left)
    const screenWidth = this.screen.width
    left = clamp(left, padding, screenWidth - padding - menuWidth * this.camera.zoom)

    let top = this.camera.zoom * (extents.top - menuHeight - offset - this.camera.top)
    if (top < 0) {
      top = this.camera.zoom * (extents.bottom + offset - this.camera.top)
    }

    element.style.left = `${left}px`
    element.style.top = `${top}px`

    // hide menu if selection is off screen
    if (
      this.camera.zoom * (extents.right - this.camera.left) < 0 ||
      this.camera.zoom * (extents.left - this.camera.left) > screenWidth
    ) {
      element.style.display = 'none'
    } else {
      element.style.display = 'block'
    }
  }
}
