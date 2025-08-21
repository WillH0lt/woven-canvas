import {
  BaseExtension,
  type BaseResources,
  ComponentRegistry,
  floatingMenuDivider,
  floatingMenuStandardButtons,
} from '@infinitecanvas/core'
import { Color, floatingMenuButtonColor } from '@infinitecanvas/extension-color'

import './webComponents'
import { Stroke } from './components'
import * as sys from './systems'

class PerfectFreehandExtensionClass extends BaseExtension {
  public static blocks = [
    {
      tag: 'ic-perfect-freehand-stroke',
      resizeMode: 'free' as const,
      floatingMenu: [floatingMenuButtonColor, floatingMenuDivider, ...floatingMenuStandardButtons],
      components: [Stroke, Color],
    },
  ]

  public static dependsOn = ['ColorExtension']

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Stroke)

    this._captureGroup = this.createGroup(resources, sys.CaptureStroke)

    this._updateGroup = this.createGroup(resources, sys.UpdateStroke)
  }
}

export const PerfectFreehandExtension = () => new PerfectFreehandExtensionClass()
