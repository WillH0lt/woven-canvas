import {
  BaseExtension,
  floatingMenuButtonColor,
  floatingMenuDivider,
  floatingMenuStandardButtons,
} from '@infinitecanvas/core'
import { Color } from '@infinitecanvas/core/components'
import { Text, TextEditorFloatingMenuButtons, floatingMenuButtonVerticalAlign } from '@infinitecanvas/extension-text'

import './webComponents'

class StickyNotesExtensionClass extends BaseExtension {
  public readonly blocks = [
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

  public readonly tools = [
    {
      name: 'sticky-note',
      buttonTag: 'ic-sticky-note-tool',
      buttonTooltip: 'Sticky Note',
    },
  ]

  public readonly dependsOn = ['TextExtension']
}

export const StickyNotesExtension = () => new StickyNotesExtensionClass()
