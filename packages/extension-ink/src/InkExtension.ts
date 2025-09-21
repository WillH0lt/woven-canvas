import {
  BaseExtension,
  type BaseResources,
  ComponentRegistry,
  floatingMenuButtonColor,
  floatingMenuDivider,
  floatingMenuStandardButtons,
} from '@infinitecanvas/core'
import { Color } from '@infinitecanvas/core/components'

import './webComponents'
import { Stroke } from './components'
import * as sys from './systems'

class InkExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-ink-stroke',
      resizeMode: 'free' as const,
      floatingMenu: [floatingMenuButtonColor, floatingMenuDivider, ...floatingMenuStandardButtons],
      components: [Stroke, Color],
    },
  ]

  public readonly tools = [
    {
      name: 'ink',
      buttonTag: 'ic-ink-tool',
      buttonTooltip: 'Draw',
    },
  ]

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Stroke)

    this.captureGroup = this.createGroup(resources, sys.CaptureStroke)

    this.updateGroup = this.createGroup(resources, sys.UpdateStroke)
  }
}

export const InkExtension = () => new InkExtensionClass()
