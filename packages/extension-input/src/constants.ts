import { CoreCommand } from '@infinitecanvas/core'

export const defaultKeybinds = [
  {
    command: CoreCommand.Undo,
    key: 'z',
    mod: true,
  },
  {
    command: CoreCommand.Redo,
    key: 'y',
    mod: true,
  },
  {
    command: CoreCommand.Redo,
    key: 'z',
    mod: true,
    shift: true,
  },
  {
    command: CoreCommand.Cut,
    key: 'x',
    mod: true,
  },
  {
    command: CoreCommand.Copy,
    key: 'c',
    mod: true,
  },
  {
    command: CoreCommand.Paste,
    key: 'v',
    mod: true,
  },
  {
    command: CoreCommand.RemoveSelected,
    key: 'delete',
  },
  {
    command: CoreCommand.SelectAll,
    key: 'a',
    mod: true,
  },
]
