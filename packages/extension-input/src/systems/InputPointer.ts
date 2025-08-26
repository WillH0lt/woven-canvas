import { type BaseResources, PointerButton } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import { type Entity, System } from '@lastolivegames/becsy'

function getPointerButton(b: number): PointerButton {
  if (b === -1) return PointerButton.None
  if (b === 0) return PointerButton.Left
  if (b === 1) return PointerButton.Middle
  if (b === 2) return PointerButton.Right
  if (b === 3) return PointerButton.Back
  if (b === 4) return PointerButton.Forward
  if (b === 5) return PointerButton.PenEraser
  return PointerButton.None
}

export class InputPointer extends System {
  private readonly pointers = this.query((q) => q.current.with(comps.Pointer).write)

  protected declare readonly resources: BaseResources

  private readonly frame = this.singleton.read(comps.Frame)

  private readonly eventsBuffer: PointerEvent[] = []

  private onPointerDown(e: PointerEvent): Entity {
    return this.createEntity(comps.Pointer, {
      id: e.pointerId,
      downPosition: [e.clientX, e.clientY],
      downFrame: this.frame.value,
      position: [e.clientX, e.clientY],
      button: getPointerButton(e.button),
    })
  }

  private onPointerMove(e: PointerEvent, pointers: Entity[]): void {
    const pointerEntity = pointers.find((p) => p.alive && p.read(comps.Pointer).id === e.pointerId)
    if (!pointerEntity) return

    pointerEntity.write(comps.Pointer).position = [e.clientX, e.clientY]
  }

  private onPointerUp(e: PointerEvent, pointers: Entity[]): void {
    for (const pointerEntity of pointers) {
      if (pointerEntity.read(comps.Pointer).id === e.pointerId) {
        const pointer = pointerEntity.write(comps.Pointer)
        pointer.position = [e.clientX, e.clientY]
        pointerEntity.delete()
      }
    }
  }

  private onPointerCancel(e: PointerEvent, pointers: Entity[]): void {
    // e.preventDefault()
    console.warn('Pointer event cancelled:', e)

    this.onPointerUp(e, pointers)
  }

  public initialize(): void {
    const domElement = this.resources.domElement

    window.addEventListener('pointermove', (e) => this.eventsBuffer.push(e))
    domElement.addEventListener('pointerdown', (e) => this.eventsBuffer.push(e))
    domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.eventsBuffer.push(e)
    })
    window.addEventListener('pointerup', (e) => this.eventsBuffer.push(e))
    window.addEventListener('pointercancel', (e) => this.eventsBuffer.push(e))
  }

  public execute(): void {
    const pointers = [...this.pointers.current]

    for (const e of this.eventsBuffer) {
      if (e.type === 'pointerdown') {
        const pointer = this.onPointerDown(e)
        pointers.push(pointer)
      } else if (e.type === 'contextmenu') {
        // if there's already a pointerdown event in this frame, ignore the contextmenu
        const hasPointerDown = !!this.eventsBuffer.find((e) => e.type === 'pointerdown')
        if (hasPointerDown) continue

        const pointer = this.onPointerDown(e)
        pointers.push(pointer)
      } else if (e.type === 'pointermove') {
        this.onPointerMove(e, pointers)
      } else if (e.type === 'pointerup') {
        this.onPointerUp(e, pointers)
      } else if (e.type === 'pointercancel') {
        this.onPointerCancel(e, pointers)
      }
    }

    this.eventsBuffer.length = 0
  }
}
