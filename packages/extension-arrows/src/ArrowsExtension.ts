import { BaseExtension, floatingMenuDivider, floatingMenuStandardButtons } from '@infinitecanvas/core'
import { Color, floatingMenuButtonColor } from '@infinitecanvas/extension-color'
import { Text, TextEditorFloatingMenuButtons, floatingMenuButtonVerticalAlign } from '@infinitecanvas/extension-text'

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
      components: [Color, Text],
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
}

export const ArrowsExtension = () => new ArrowsExtensionClass()
