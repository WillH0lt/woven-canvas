import {
  BaseExtension,
  CoreCommand,
  type CoreCommandArgs,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type State,
  floatingMenuDivider,
  floatingMenuStandardButtons,
} from '@infinitecanvas/core'
import { Color, floatingMenuButtonColor } from '@infinitecanvas/extension-color'
import { Text, TextEditorFloatingMenuButtons } from '@infinitecanvas/extension-text'
import { type ReadonlySignal, computed } from '@preact/signals-core'

import { floatingMenuButtonVerticalAlign } from './buttonCatelog'
import { StickyNote } from './components'
import './elements'
import type { VerticalAlign } from './types'

declare module '@infinitecanvas/core' {
  interface ICommands {
    stickyNote: {
      setVerticalAlign: (blockId: string, verticalAlign: VerticalAlign) => void
    }
  }

  interface IStore {
    stickyNote: {
      stickyNoteById: (id: string) => ReadonlySignal<StickyNote | undefined>
    }
  }
}

class StickyNoteExtensionClass extends BaseExtension {
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
      components: [Color, Text, StickyNote],
    },
  ]

  public static dependsOn = new Set(['ColorExtension', 'TextExtension'])

  public addCommands(send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> {
    return {
      stickyNote: {
        setVerticalAlign: (blockId: string, verticalAlign: VerticalAlign) => {
          send(CoreCommand.ApplySnapshot, {
            [blockId]: {
              StickyNote: {
                verticalAlign,
              },
            },
          })
        },
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      stickyNote: {
        stickyNoteById: (id: string): ReadonlySignal<StickyNote | undefined> =>
          computed(() => state.getComponents(StickyNote).value[id]?.value),
      },
    }
  }
}

export const StickyNoteExtension = () => new StickyNoteExtensionClass()
