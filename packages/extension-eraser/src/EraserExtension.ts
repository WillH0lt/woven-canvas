import { BaseExtension, type BaseResources, ComponentRegistry } from '@infinitecanvas/core'

import './webComponents'
import { EraserStroke } from './components'
import * as sys from './systems'

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

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(EraserStroke)

    this._captureGroup = this.createGroup(resources, sys.CaptureEraser)

    this._updateGroup = this.createGroup(resources, sys.UpdateEraser)
  }
}

export const EraserExtension = () => new EraserExtensionClass()
