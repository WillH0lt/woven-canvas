import { type Resources, comps } from '@infinitecanvas/core'
import { System, co } from '@lastolivegames/becsy'

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

  @co private *onWheel(e: WheelEvent): Generator {
    e.preventDefault()

    this.pointer.wheelDelta = normalizedDeltaY(e)
    this.setTrigger('wheelTrigger')

    yield
  }

  public initialize(): void {
    const domElement = this.resources.domElement

    window.addEventListener('pointermove', this.onPointerMove.bind(this))
    domElement.addEventListener('pointerdown', this.onPointerDown.bind(this))
    window.addEventListener('pointerup', this.onPointerUp.bind(this))
    window.addEventListener('pointercancel', this.onPointerCancel.bind(this))
    domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
  }

  public execute(): void {
    this.frame++
  }
}

export function normalizedDeltaY(event: WheelEvent): number {
  const LINE_MODE = 1
  const PAGE_MODE = 2

  // Default line height in pixels (approximate)
  const LINE_HEIGHT = 16

  // Default page height in pixels (approximate)
  const PAGE_HEIGHT = window.innerHeight

  let deltaY = event.deltaY

  // Normalize based on the deltaMode
  if (event.deltaMode === LINE_MODE) {
    // Convert from lines to pixels
    deltaY *= LINE_HEIGHT
  } else if (event.deltaMode === PAGE_MODE) {
    // Convert from pages to pixels
    deltaY *= PAGE_HEIGHT
  }

  // Account for Firefox (which often uses smaller values)
  if (navigator.userAgent.includes('Firefox')) {
    deltaY *= 4
  }

  // You may want to add a multiplier for macOS where values can be smaller
  if (navigator.userAgent.includes('Mac') || navigator.userAgent.includes('Macintosh')) {
    deltaY *= 1.5
  }

  // Clamp the value to a reasonable range
  deltaY = Math.min(Math.max(deltaY, -100), 100)

  return deltaY
}
