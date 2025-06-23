import { PointerButton, type Resources, comps } from '@infinitecanvas/core'
import { System, co } from '@lastolivegames/becsy'

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

  private readonly resources!: Resources

  private pointerUpFrames = new Set<string>()

  private pointerDownFrames = new Set<string>()

  private frame = 0

  private pointerFrame(pointerId: number): string {
    return `${this.frame}:${pointerId}`
  }

  @co private *onPointerMove(e: PointerEvent): Generator {
    const pointerEntity = this.pointers.current.find((p) => p.alive && p.read(comps.Pointer).id === e.pointerId)
    if (!pointerEntity) return

    pointerEntity.write(comps.Pointer).position = [e.clientX, e.clientY]

    yield
  }

  @co private *onPointerDown(e: PointerEvent): Generator {
    this.pointerDownFrames.add(this.pointerFrame(e.pointerId))
    if (this.pointerUpFrames.has(this.pointerFrame(e.pointerId))) {
      console.warn(
        `Tried to handle pointerdown, but pointerup has been called this frame at: ${this.pointerFrame(e.pointerId)}`,
      )
      return
    }

    this.createEntity(comps.Pointer, {
      id: e.pointerId,
      downPosition: [e.clientX, e.clientY],
      position: [e.clientX, e.clientY],
      button: getPointerButton(e.button),
    })

    yield
  }

  @co private *onPointerUp(e: PointerEvent): Generator {
    this.pointerUpFrames.add(this.pointerFrame(e.pointerId))
    if (this.pointerDownFrames.has(this.pointerFrame(e.pointerId))) {
      console.warn(
        `Tried to handle pointerup, but pointerdown has been called this frame at: ${this.pointerFrame(e.pointerId)}`,
      )
      return
    }

    for (const pointerEntity of this.pointers.current) {
      if (pointerEntity.read(comps.Pointer).id === e.pointerId) {
        const pointer = pointerEntity.write(comps.Pointer)
        pointer.position = [e.clientX, e.clientY]
        pointerEntity.delete()
      }
    }

    yield
  }

  @co private *onPointerCancel(e: PointerEvent): Generator {
    e.preventDefault()
    console.warn('Pointer event cancelled:', e)

    this.onPointerUp(e)

    yield
  }

  public initialize(): void {
    const domElement = this.resources.domElement

    window.addEventListener('pointermove', this.onPointerMove.bind(this))
    domElement.addEventListener('pointerdown', this.onPointerDown.bind(this))
    window.addEventListener('pointerup', this.onPointerUp.bind(this))
    window.addEventListener('pointercancel', this.onPointerCancel.bind(this))
  }

  public execute(): void {
    this.frame++
  }
}
