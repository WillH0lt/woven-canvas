import { co } from '@lastolivegames/becsy'

import { type BaseResources, BaseSystem } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'

import { InputKeyboard } from './InputKeyboard'

export class InputScreen extends BaseSystem {
  private readonly screens = this.query((q) => q.current.with(comps.Screen).write)

  protected declare readonly resources: BaseResources

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(InputKeyboard))
  }

  @co private *handleResize(): Generator {
    const screen = this.screens.current[0].write(comps.Screen)
    screen.width = this.resources.domElement.clientWidth
    screen.height = this.resources.domElement.clientHeight

    yield
  }

  public initialize(): void {
    const resizeObserver = new ResizeObserver(this.handleResize.bind(this))
    resizeObserver.observe(this.resources.domElement)
  }
}
