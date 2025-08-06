import {
  BaseExtension,
  floatingMenuDivider,
  floatingMenuStandardButtons,
} from '@infinitecanvas/core'
import { Color, floatingMenuButtonColor } from '@infinitecanvas/extension-color'
import { Text, TextEditorFloatingMenuButtons, floatingMenuButtonVerticalAlign } from '@infinitecanvas/extension-text'

import './elements'

class StickyNotesExtensionClass extends BaseExtension {
  public static blockDefs = [
    {
      tag: 'ic-sticky-note',
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

  public static dependsOn = ['ColorExtension', 'TextExtension']
}

export const StickyNotesExtension = () => new StickyNotesExtensionClass()
