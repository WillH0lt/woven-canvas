import { type Resources, comps } from '@infinitecanvas/core'
import { System, co } from '@lastolivegames/becsy'

export class InputMouse extends System {
  private readonly mice = this.query((q) => q.current.with(comps.Mouse).write)

  private get mouse(): comps.Mouse {
    return this.mice.current[0].write(comps.Mouse)
  }

  // declaring to becsy that mouse is a singleton component
  private readonly _mouse = this.singleton.read(comps.Mouse)

  private readonly resources!: Resources

  @co private *onMouseMove(e: MouseEvent): Generator {
    this.mouse.position = [e.clientX, e.clientY]
    this.setTrigger('moveTrigger')

    yield
  }

  @co private *setTrigger(triggerKey: string): Generator {
    if (!(triggerKey in this.mouse)) {
      throw new Error(`Invalid trigger key: ${triggerKey}`)
    }

    Object.assign(this.mouse, { [triggerKey]: true })

    yield co.waitForFrames(1)

    Object.assign(this.mouse, { [triggerKey]: false })
  }

  @co private *onWheel(e: WheelEvent): Generator {
    e.preventDefault()

    this.mouse.wheelDelta = normalizedDeltaY(e)
    this.setTrigger('wheelTrigger')

    yield
  }

  public initialize(): void {
    const domElement = this.resources.domElement

    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
    window.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
      },
      { passive: false },
    )
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
