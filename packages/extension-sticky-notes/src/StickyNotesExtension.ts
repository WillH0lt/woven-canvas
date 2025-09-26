import { BaseExtension } from '@infinitecanvas/core'
import { Color, Text, VerticalAlign } from '@infinitecanvas/core/components'

import './webComponents'

class StickyNotesExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-sticky-note',
      editOptions: {
        canEdit: true,
      },
      components: [Color, Text, VerticalAlign],
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
