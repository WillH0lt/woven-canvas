import { type EditorPlugin, type FontFamilyInput, Key, Redo, Undo } from '@woven-canvas/core'

import type { CanvasStore } from '@woven-ecs/canvas-store'
import { CURSORS } from './cursors'
import { BlockPlacementState } from './singletons'
import { blockPlacementSystem, undoRedoSystem } from './systems'

export interface EditingPluginResources {
  store: CanvasStore
}

export interface EditingPluginOptions {
  store: CanvasStore
}

export const DEFAULT_FONTS: FontFamilyInput[] = [
  {
    name: 'Figtree',
    displayName: 'Figtree',
    url: 'https://fonts.googleapis.com/css2?family=Figtree',
    previewImage: 'https://storage.googleapis.com/scrolly-page-fonts/Figtree.png',
  },
  {
    name: 'Shantell Sans',
    displayName: 'Shantell Sans',
    url: 'https://fonts.googleapis.com/css2?family=Shantell+Sans',
    previewImage: 'https://storage.googleapis.com/scrolly-page-fonts/ShantellSans.png',
  },
  {
    name: 'Courier Prime',
    displayName: 'Courier Prime',
    url: 'https://fonts.googleapis.com/css2?family=Courier+Prime',
    previewImage: 'https://storage.googleapis.com/scrolly-page-fonts/CourierPrime.png',
  },
  {
    name: 'EB Garamond',
    displayName: 'EB Garamond',
    url: 'https://fonts.googleapis.com/css2?family=EB+Garamond',
    previewImage: 'https://storage.googleapis.com/scrolly-page-fonts/EBGaramond.png',
  },
]

/**
 * Editing plugin - provides store integration for undo/redo, block placement,
 * default cursors, and default fonts.
 */
export function EditingPlugin(options: EditingPluginOptions): EditorPlugin {
  return {
    name: 'editing',
    resources: { store: options.store } satisfies EditingPluginResources,
    singletons: [BlockPlacementState],
    systems: [blockPlacementSystem, undoRedoSystem],
    cursors: CURSORS,
    fonts: DEFAULT_FONTS,
    keybinds: [
      { command: Undo.name, key: Key.Z, mod: true },
      { command: Redo.name, key: Key.Y, mod: true },
      { command: Redo.name, key: Key.Z, mod: true, shift: true },
    ],
  }
}
