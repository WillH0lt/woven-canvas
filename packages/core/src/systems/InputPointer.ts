import type { Entity } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import { Pointer } from '../components'
import { PointerButton } from '../types'
import { InputKeyboard } from './InputKeyboard'
import { InputScreen } from './InputScreen'

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

export class InputPointer extends BaseSystem {
  private readonly writablePointers = this.query((q) => q.current.with(Pointer).write)

  private readonly eventsBuffer: PointerEvent[] = []

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(InputKeyboard, InputScreen))
  }

  private onPointerDown(e: PointerEvent): Entity {
    const p: [number, number] = [e.clientX, e.clientY]
    const w: [number, number] = this.camera.toWorld(p)
    const pointer = this.createEntity(Pointer, {
      id: e.pointerId,
      downPosition: p,
      downWorldPosition: w,
      downFrame: this.frame.value,
      worldPosition: w,
      button: getPointerButton(e.button),
    })

    pointer.write(Pointer).addPositionSample(p, this.time)

    return pointer
  }

  private onPointerMove(e: PointerEvent, pointers: Entity[]): void {
    const pointerEntity = pointers.find((p) => p.alive && p.read(Pointer).id === e.pointerId)
    if (!pointerEntity) return

    const p: [number, number] = [e.clientX, e.clientY]
    const pointer = pointerEntity.write(Pointer)
    pointer.addPositionSample(p, this.time)
    pointer.worldPosition = this.camera.toWorld(p)
  }

  private onPointerUp(e: PointerEvent, pointers: Entity[]): void {
    for (const pointerEntity of pointers) {
      if (pointerEntity.read(Pointer).id === e.pointerId) {
        const p: [number, number] = [e.clientX, e.clientY]
        const pointer = pointerEntity.write(Pointer)
        pointer.addPositionSample(p, this.time)
        pointer.worldPosition = this.camera.toWorld(p)
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
    const pointers = [...this.writablePointers.current]

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
