import { type Resources, comps } from '@infinitecanvas/core'
import { System, co } from '@lastolivegames/becsy'

export class InputPointer extends System {
  private readonly pointer = this.singleton.write(comps.Pointer)

  private readonly resources!: Resources

  @co private *onPointerMove(e: PointerEvent): Generator {
    this.pointer.position = [e.clientX, e.clientY]
    this.setTrigger('moveTrigger')

    yield
  }

  @co private *onPointerDown(e: PointerEvent): Generator {
    if (e.button !== 0) return

    this.pointer.isDown = true
    this.pointer.position = [e.clientX, e.clientY]
    this.pointer.downPosition = this.pointer.position
    this.setTrigger('downTrigger')

    yield
  }

  @co private *onPointerUp(e: PointerEvent): Generator {
    this.pointer.isDown = false
    this.pointer.position = [e.clientX, e.clientY]
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

  public initialize(): void {
    const domElement = this.resources.domElement

    window.addEventListener('pointermove', this.onPointerMove.bind(this))
    domElement.addEventListener('pointerdown', this.onPointerDown.bind(this))
    window.addEventListener('pointerup', this.onPointerUp.bind(this))
  }
}
