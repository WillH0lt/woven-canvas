import { type Resources, comps } from '@infinitecanvas/core'
import { System, co } from '@lastolivegames/becsy'

export class InputPointer extends System {
  private readonly pointer = this.singleton.write(comps.Pointer)

  private readonly resources!: Resources

  @co private *onPointerMove(e: PointerEvent): Generator {
    this.pointer.position = [e.clientX, e.clientY]
    yield
  }

  @co private *onPointerDown(e: PointerEvent): Generator {
    this.pointer.isDown = true
    this.pointer.position = [e.clientX, e.clientY]
    yield
  }

  @co private *onPointerUp(e: PointerEvent): Generator {
    this.pointer.isDown = false
    this.pointer.position = [e.clientX, e.clientY]
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
  // @co private *onPointerDown(e: PointerEvent): Generator {
  //   // this.pointerInput.isDown = true

  //   console.log('Pointer down at:', performance.now())

  //   yield
  // }

  public initialize(): void {
    const domElement = this.resources.domElement

    domElement.addEventListener('pointermove', this.onPointerMove.bind(this))
    domElement.addEventListener('pointerdown', (e) => {
      this.onPointerDown(e)
      this.setTrigger('downTrigger')
    })

    domElement.addEventListener('pointerup', (e) => {
      this.onPointerUp(e)
      this.setTrigger('upTrigger')
    })
  }
}
