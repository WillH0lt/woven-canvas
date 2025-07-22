import { BaseSystem, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import type { EditableTextElement } from '../elements'
import type { ControlResources } from '../types'

export class PreRenderOverlay extends BaseSystem {
  protected declare readonly resources: ControlResources

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  private readonly pointers = this.query((q) => q.removed.with(comps.Pointer).read)

  private readonly entities = this.query(
    (q) => q.added.changed.removed.with(comps.Persistent, comps.Text, comps.Edited).with(comps.Block).trackWrites,
  )

  public execute(): void {
    if (this.cameras.changed.length > 0) {
      const camera = this.cameras.changed[0].read(comps.Camera)
      const viewport = this.resources.viewport
      viewport.style.transform = `translate(${-camera.left * camera.zoom}px, ${-camera.top * camera.zoom}px) scale(${camera.zoom})`
    }

    for (const entity of this.entities.added) {
      const element = this.createTextElement(entity)
      this.updateElementHtml(entity, element)
      this.resources.viewport.appendChild(element)
    }

    for (const entity of this.entities.changed) {
      const block = entity.read(comps.Block)
      const element = this.resources.viewport.querySelector<EditableTextElement>(`[id='${block.id}']`)
      if (element) {
        this.updateElementHtml(entity, element)
      }
    }

    if (this.entities.removed.length > 0) {
      this.accessRecentlyDeletedData()
    }
    for (const entity of this.entities.removed) {
      const block = entity.read(comps.Block)
      const element = this.resources.viewport.querySelector<EditableTextElement>(`[id='${block.id}']`)
      if (element) {
        this.resources.viewport.removeChild(element)
      }
    }
  }

  private createTextElement(entity: Entity): EditableTextElement {
    const element = document.createElement('ic-editable-text')
    const block = entity.read(comps.Block)
    element.id = block.id
    element.blockId = block.id

    if (this.pointers.removed.length > 0) {
      this.accessRecentlyDeletedData()
      const pointer = this.pointers.removed[0]
      const position = pointer.read(comps.Pointer).position

      element.pointerStartX = position[0]
      element.pointerStartY = position[1]
    }

    return element
  }

  private updateElementHtml(entity: Entity, element: EditableTextElement): void {
    const block = entity.read(comps.Block)

    element.style.position = 'absolute'
    element.style.left = `${block.left}px`
    element.style.top = `${block.top}px`
    element.style.width = `${block.width}px`
    element.style.height = `${block.height}px`
    element.style.transform = `rotateZ(${block.rotateZ}rad)`
  }
}
