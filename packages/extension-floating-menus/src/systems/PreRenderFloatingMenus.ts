import { BaseSystem, PointerButton, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import type { z } from 'zod'
import { computeExtents } from '../helpers'
import type { Button, FloatingMenusResources } from '../types'

export class PreRenderFloatingMenus extends BaseSystem {
  protected declare readonly resources: FloatingMenusResources

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly selectedBlocks = this.query(
    (q) =>
      q.addedChangedOrRemoved.current.with(comps.Selected).with(comps.Block).trackWrites.using(comps.Aabb, comps.Edited)
        .read,
  )

  private readonly pointers = this.query((q) => q.added.removed.changed.current.with(comps.Pointer).read.trackWrites)

  public execute(): void {
    if (this.cameras.changed.length > 0) {
      const camera = this.cameras.changed[0].read(comps.Camera)
      const viewport = this.resources.viewport
      viewport.style.transform = `translate(${-camera.left * camera.zoom}px, ${-camera.top * camera.zoom}px) scale(${camera.zoom})`
    }

    const pointerEvents = this.getPointerEvents(this.pointers, this.camera, this.intersect, {
      button: PointerButton.Left,
    })
    if (pointerEvents.find((e) => e.type === 'pointerDown')) {
      this.removeFloatingMenuElement()
    }

    if (this.pointers.current.length === 0) {
      if (this.selectedBlocks.addedChangedOrRemoved.length > 0 || pointerEvents.find((e) => e.type === 'pointerUp')) {
        this.syncFloatingMenuElement()
      }
    }
  }

  syncFloatingMenuElement(): void {
    const mySelectedBlocks = this.selectedBlocks.current.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    )

    if (mySelectedBlocks.length === 0) {
      this.removeFloatingMenuElement()
      return
    }

    let kind = 'group'
    if (mySelectedBlocks.length === 1) {
      kind = mySelectedBlocks[0].read(comps.Block).kind

      if (mySelectedBlocks[0].has(comps.Edited)) {
        kind += '-edited'
      }
    }

    const menu = this.resources.options.menus.find((menu) => menu.blockKind === kind)

    if (!menu) {
      this.removeFloatingMenuElement()
      return
    }

    this.createOrUpdateFloatingMenuElement(mySelectedBlocks, menu.buttons)
  }

  createOrUpdateFloatingMenuElement(selectedBlocks: Entity[], buttons: z.infer<typeof Button>[]): void {
    let element = document.querySelector('ic-floating-menu')
    if (!element) {
      element = document.createElement('ic-floating-menu')
      this.resources.viewport.appendChild(element)
    }

    element.buttons = buttons

    const width = element.buttons.reduce((acc, button) => acc + button.width, 0)
    const height = 40

    element.style.position = 'absolute'
    element.style.pointerEvents = 'auto'
    element.style.width = `${width}px`
    element.style.height = `${height}px`
    element.requestUpdate()

    const extents = computeExtents(selectedBlocks)
    const cx = (extents.left + extents.right) / 2
    element.style.left = `${cx - width / 2}px`
    element.style.top = `${extents.top - height - 10}px`
  }

  removeFloatingMenuElement(): void {
    const element = document.querySelector('ic-floating-menu')
    if (element) {
      element.remove()
    }
  }
}
