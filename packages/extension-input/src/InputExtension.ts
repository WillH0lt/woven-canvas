import { Extension, type Resources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems/index.js'

export class InputExtension extends Extension {
  public async preBuild(resources: Resources): Promise<void> {
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
