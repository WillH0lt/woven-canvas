import {
  BaseExtension,
  floatingMenuButtonColor,
  floatingMenuButtonVerticalAlign,
  floatingMenuDivider,
  floatingMenuStandardButtons,
  textEditorFloatingMenuButtons,
} from '@infinitecanvas/core'
import { Color, Text } from '@infinitecanvas/core/components'

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
      editedFloatingMenu: textEditorFloatingMenuButtons,
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
}

export const StickyNotesExtension = () => new StickyNotesExtensionClass()
