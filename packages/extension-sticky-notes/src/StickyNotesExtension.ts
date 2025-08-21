import { BaseExtension, floatingMenuDivider, floatingMenuStandardButtons } from '@infinitecanvas/core'
import { Color, floatingMenuButtonColor } from '@infinitecanvas/extension-color'
import { Text, TextEditorFloatingMenuButtons, floatingMenuButtonVerticalAlign } from '@infinitecanvas/extension-text'

import './webComponents'

class StickyNotesExtensionClass extends BaseExtension {
  public static blocks = [
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

  public static tools = [
    {
      name: 'sticky-note',
      buttonTag: 'ic-sticky-note-tool',
      buttonTooltip: 'Sticky Note',
    },
  ]

  public static dependsOn = ['ColorExtension', 'TextExtension']
}

export const StickyNotesExtension = () => new StickyNotesExtensionClass()
