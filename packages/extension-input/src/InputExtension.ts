import type { Resources } from '@infinitecanvas/core'
import { Extension } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems/index.js'

export class InputExtension extends Extension {
  public async initialize(resources: Resources): Promise<void> {
    const group = System.group(sys.InputScreen, { resources }, sys.InputPointer, { resources }, sys.InputKeyboard, {
      resources,
    })

    this._inputGroup = group
  }
}
