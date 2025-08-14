import { BaseExtension, type BaseResources } from '@infinitecanvas/core'

import * as sys from './systems/index.js'
import { InputOptions, type InputOptionsInput, type InputResources } from './types.js'

class InputExtensionClass extends BaseExtension {
  private options: InputOptions

  constructor(options: InputOptionsInput) {
    super()
    this.options = InputOptions.parse(options)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    const inputResources: InputResources = {
      ...this.options,
      ...resources,
    }

    this._inputGroup = this.createGroup(
      inputResources,
      sys.InputScreen,
      sys.InputPointer,
      sys.InputKeyboard,
      sys.InputMouse,
    )

    this._captureGroup = this.createGroup(inputResources, sys.CaptureKeyboard)
  }
}

export const InputExtension = (options: InputOptionsInput = {}) => new InputExtensionClass(options)
