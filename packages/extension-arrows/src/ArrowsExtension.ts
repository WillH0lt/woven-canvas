import {
  BaseExtension,
  type BaseResources,
  ComponentRegistry,
  floatingMenuButtonColor,
  floatingMenuDivider,
  floatingMenuStandardButtons,
} from '@infinitecanvas/core'
import { floatingMenuButtonVerticalAlign, textEditorFloatingMenuButtons } from '@infinitecanvas/core'
import { Color, Connector, Text } from '@infinitecanvas/core/components'

import { Arrow, ArrowTrim } from './components'
import * as sys from './systems'
import './webComponents'

class ArrowsExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-arrow',
      editOptions: {
        canEdit: true,
      },
      floatingMenu: [
        floatingMenuButtonColor,
        floatingMenuButtonVerticalAlign,
        floatingMenuDivider,
        ...floatingMenuStandardButtons,
      ],
      editedFloatingMenu: textEditorFloatingMenuButtons,
      resizeMode: 'groupOnly' as const,
      placementMode: 'arrow' as const,
      components: [Arrow, Color, Text, Connector, ArrowTrim],
      // attachmentNames: ['start', 'end']
    },
  ]

  public readonly tools = [
    {
      name: 'arrow',
      buttonTag: 'ic-arrow-tool',
      buttonTooltip: 'Arrow',
    },
  ]

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Arrow)

    this._captureGroup = this.createGroup(resources, sys.CaptureArrowDraw, sys.CaptureArrowTransform)

    this._updateGroup = this.createGroup(resources, sys.UpdateArrowTransform)

    this._postUpdateGroup = this.createGroup(resources, sys.PostUpdateArrowHitGeometry)
  }
}

export const ArrowsExtension = () => new ArrowsExtensionClass()
