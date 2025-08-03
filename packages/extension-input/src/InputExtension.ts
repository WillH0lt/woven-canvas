import { BaseExtension, type BaseResources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems/index.js'

class InputExtensionClass extends BaseExtension {
  public async preBuild(resources: BaseResources): Promise<void> {
    this._inputGroup = this.createGroup(
      resources,
      sys.InputScreen,
      sys.InputPointer,
      sys.InputKeyboard,
      sys.InputMouse,
    )
  }
}

export const InputExtension = () => new InputExtensionClass()
