import { co } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import { Screen } from '../components'
import type { BaseResources } from '../types'
import { InputKeyboard } from './InputKeyboard'

export class InputScreen extends BaseSystem {
  private readonly screens = this.query((q) => q.current.with(Screen).write)

  protected declare readonly resources: BaseResources

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(InputKeyboard))
  }

  @co private *handleResize(): Generator {
    const screen = this.screens.current[0].write(Screen)
    screen.width = this.resources.domElement.clientWidth
    screen.height = this.resources.domElement.clientHeight

    yield
  }

  public initialize(): void {
    const resizeObserver = new ResizeObserver(this.handleResize.bind(this))
    resizeObserver.observe(this.resources.domElement)
  }
}
