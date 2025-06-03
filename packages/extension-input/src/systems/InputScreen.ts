import { System, co } from '@lastolivegames/becsy'

import { type Resources, comps } from '@infinitecanvas/core'

export class InputScreen extends System {
  private readonly screen = this.singleton.write(comps.Screen)

  private readonly resources!: Resources

  @co private *setResizeTrigger(): Generator {
    co.cancelIfCoroutineStarted()

    this.screen.resizedTrigger = true

    yield co.waitForFrames(1)

    this.screen.resizedTrigger = false
  }

  public initialize(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.setResizeTrigger()
    })
    resizeObserver.observe(this.resources.domElement)
  }
}
