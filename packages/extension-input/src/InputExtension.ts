import { BaseExtension, type BaseResources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems/index.js'

export class InputExtension extends BaseExtension {
  public name = 'input'

  public async preBuild(resources: BaseResources): Promise<void> {
    this._inputGroup = System.group(
      sys.InputScreen,
      { resources },
      sys.InputPointer,
      { resources },
      sys.InputKeyboard,
      { resources },
      sys.InputMouse,
      { resources },
    )
  }
}
