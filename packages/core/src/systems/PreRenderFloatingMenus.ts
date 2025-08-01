import type { Entity } from '@lastolivegames/becsy'
import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import { computeExtents } from '../helpers'
import { PointerButton } from '../types'
import type { CoreResources } from '../types'

export class PreRenderFloatingMenus extends BaseSystem {
  protected declare readonly resources: CoreResources

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly selectedBlocks = this.query(
    (q) => q.addedChangedOrRemoved.current.with(comps.Selected).with(comps.Block).trackWrites.using(comps.Aabb).read,
  )

  private readonly editedBlocks = this.query((q) => q.current.with(comps.Edited))

  private readonly pointers = this.query((q) => q.added.removed.changed.current.with(comps.Pointer).read.trackWrites)

  public execute(): void {
    if (this.cameras.changed.length > 0) {
      const camera = this.cameras.changed[0].read(comps.Camera)
      const menuContainer = this.resources.menuContainer
      menuContainer.style.transform = `translate(${-camera.left * camera.zoom}px, ${-camera.top * camera.zoom}px) scale(${camera.zoom})`
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

    let element = document.querySelector('ic-floating-menu')
    if (!element) {
      element = document.createElement('ic-floating-menu')
      this.resources.menuContainer.appendChild(element)
    }

    element.buttons = buttons
    element.blockId = blockId

    const width = element.buttons.reduce((acc, button) => acc + button.width, 0)
    const height = 40

    element.style.position = 'absolute'
    element.style.pointerEvents = 'auto'
    element.style.width = `${width}px`
    element.style.height = `${height}px`
    element.requestUpdate()

    const extents = computeExtents(mySelectedBlocks)
    const cx = (extents.left + extents.right) / 2
    element.style.left = `${cx - width / 2}px`
    element.style.top = `${extents.top - height - 10}px`
  }

  removeFloatingMenuElement(): void {
    const element = document.querySelector('ic-floating-menu')
    element?.remove()
  }
}
