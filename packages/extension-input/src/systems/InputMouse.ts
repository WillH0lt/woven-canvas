import { BaseSystem } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import { co } from '@lastolivegames/becsy'
import { InputKeyboard } from './InputKeyboard'
import { InputPointer } from './InputPointer'
import { InputScreen } from './InputScreen'

export class InputMouse extends BaseSystem {
  private readonly mice = this.query((q) => q.current.with(comps.Mouse).write)

  private get writeableMouse(): comps.Mouse {
    return this.mice.current[0].write(comps.Mouse)
  }

  // declaring to becsy that mouse is a singleton component
  private readonly _mouse = this.singleton.read(comps.Mouse)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(InputKeyboard, InputScreen, InputPointer))
  }

  @co private *onMouseMove(e: MouseEvent): Generator {
    this.writeableMouse.position = [e.clientX, e.clientY]
    this.setTrigger('moveTrigger')

    yield
  }

  @co private *setTrigger(triggerKey: string): Generator {
    if (!(triggerKey in this.mouse)) {
      throw new Error(`Invalid trigger key: ${triggerKey}`)
    }

    Object.assign(this.writeableMouse, { [triggerKey]: true })

    yield co.waitForFrames(1)

    Object.assign(this.writeableMouse, { [triggerKey]: false })
  }

  @co private *onWheel(e: WheelEvent): Generator {
    e.preventDefault()

    this.writeableMouse.wheelDeltaY = normalizedDeltaY(e)
    this.writeableMouse.wheelDeltaX = e.deltaX
    this.setTrigger('wheelTrigger')

    yield
  }

  @co private *onMouseLeave(): Generator {
    // Reset mouse position when leaving the window
    // this.mouse.position = [0, 0]
    this.setTrigger('leaveTrigger')

    yield
  }

  @co private *onMouseEnter(): Generator {
    // Reset mouse position when entering the window
    // this.mouse.position = [0, 0]
    this.setTrigger('enterTrigger')

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

    domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this))
    domElement.addEventListener('mouseenter', this.onMouseEnter.bind(this))
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
