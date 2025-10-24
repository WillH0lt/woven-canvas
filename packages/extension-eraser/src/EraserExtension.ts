import { BaseExtension, type BaseResources, ComponentRegistry } from '@infinitecanvas/core'

import './webComponents'
import { EraserStroke } from './components'
import * as sys from './systems'
import { Options, type OptionsInput } from './types'

class EraserExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-eraser-stroke',
      resizeMode: 'free' as const,
      floatingMenu: [],
      components: [EraserStroke],
    },
  ]

  public readonly tools = [
    {
      name: 'eraser',
      buttonTag: 'ic-eraser-tool',
      buttonTooltip: 'Erase',
    },
  ]

  private options: Options

  constructor(options: OptionsInput) {
    super()
    this.options = Options.parse(options)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(EraserStroke)

    const eraserResources = {
      ...resources,
      ...this.options,
    }

    this.captureGroup = this.createGroup(eraserResources, sys.CaptureEraser)

    this.updateGroup = this.createGroup(eraserResources, sys.UpdateEraser)
  }
}

export const EraserExtension = (options: OptionsInput = {}) => new EraserExtensionClass(options)
