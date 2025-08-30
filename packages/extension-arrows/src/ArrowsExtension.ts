import {
  BaseExtension,
  type BaseResources,
  ComponentRegistry,
  floatingMenuDivider,
  floatingMenuStandardButtons,
} from '@infinitecanvas/core'
import { Color, floatingMenuButtonColor } from '@infinitecanvas/extension-color'
import { Text, TextEditorFloatingMenuButtons, floatingMenuButtonVerticalAlign } from '@infinitecanvas/extension-text'

import { Arrow } from './components'
import * as sys from './systems'
import './webComponents'

class ArrowsExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-arrow',
      canEdit: true,
      floatingMenu: [
        floatingMenuButtonColor,
        floatingMenuButtonVerticalAlign,
        floatingMenuDivider,
        ...floatingMenuStandardButtons,
      ],
      editedFloatingMenu: TextEditorFloatingMenuButtons,
      resizeMode: 'groupOnly' as const,
      components: [Arrow, Color, Text],
    },
  ]

  public readonly tools = [
    {
      name: 'arrow',
      buttonTag: 'ic-arrow-tool',
      buttonTooltip: 'Arrow',
    },
  ]

  public readonly dependsOn = ['ColorExtension', 'TextExtension']

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Arrow)

    this._captureGroup = this.createGroup(resources, sys.CaptureArrowDraw, sys.CaptureArrowTransform)

    this._updateGroup = this.createGroup(resources, sys.UpdateArrowDraw, sys.UpdateArrowTransform)
  }
}

export const ArrowsExtension = () => new ArrowsExtensionClass()
