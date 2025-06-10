import { type Resources, comps } from '@infinitecanvas/core'
import { System, co } from '@lastolivegames/becsy'

export const CLICK_THRESHOLD = 2

function distance(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

export class InputPointer extends System {
  private readonly pointer = this.singleton.write(comps.Pointer)

  private readonly resources!: Resources

  private pointerUpFrames = new Set<number>()

  private pointerDownFrames = new Set<number>()

  private frame = 0

  @co private *onPointerMove(e: PointerEvent): Generator {
    this.pointer.position = [e.clientX, e.clientY]
    this.setTrigger('moveTrigger')

    yield
  }

  @co private *onPointerDown(e: PointerEvent): Generator {
    if (e.button !== 0) return

    this.pointerDownFrames.add(this.frame)
    if (this.pointerUpFrames.has(this.frame)) {
      console.warn(`Tried to handle pointerdown, but pointerup has been called this frame at: ${this.frame}`)
      return
    }

    this.pointer.isDown = true
    this.pointer.position = [e.clientX, e.clientY]
    this.pointer.downPosition = this.pointer.position
    this.setTrigger('downTrigger')

    yield
  }

  @co private *onPointerUp(e: PointerEvent): Generator {
    if (e.button !== 0) return

    this.pointerUpFrames.add(this.frame)
    if (this.pointerDownFrames.has(this.frame)) {
      console.warn(`Tried to handle pointerup, but pointerdown has been called this frame at: ${this.frame}`)
      return
    }

    this.pointer.isDown = false
    this.pointer.position = [e.clientX, e.clientY]
    this.pointer.upPosition = this.pointer.position
    this.setTrigger('upTrigger')

    if (distance(this.pointer.position, this.pointer.downPosition) <= CLICK_THRESHOLD) {
      this.setTrigger('clickTrigger')
    }

    yield
  }

  @co private *setTrigger(triggerKey: string): Generator {
    if (!(triggerKey in this.pointer)) {
      throw new Error(`Invalid trigger key: ${triggerKey}`)
    }

    Object.assign(this.pointer, { [triggerKey]: true })

    yield co.waitForFrames(1)

    Object.assign(this.pointer, { [triggerKey]: false })
  }

  @co private *onPointerCancel(e: PointerEvent): Generator {
    e.preventDefault()

    this.onPointerUp({
      ...e,
      button: 0,
    })

    console.warn('Pointer event cancelled:', e)

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
