import { System, co } from '@lastolivegames/becsy'

import { type Resources, comps } from '@infinitecanvas/core'

export class InputScreen extends System {
  private readonly screen = this.singleton.write(comps.Screen)

  private readonly resources!: Resources

  @co private *handleResize(): Generator {
    co.cancelIfCoroutineStarted()

    this.screen.width = this.resources.domElement.clientWidth
    this.screen.height = this.resources.domElement.clientHeight

    this.screen.resizedTrigger = true

    yield

    this.screen.resizedTrigger = false
  }

  public initialize(): void {
    const resizeObserver = new ResizeObserver(this.handleResize.bind(this))
    resizeObserver.observe(this.resources.domElement)
  }
}
