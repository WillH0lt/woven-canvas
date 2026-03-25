import { type EditorPlugin, type FontFamilyInput, Key, Redo, Undo } from '@woven-canvas/core'

import type { CanvasStore } from '@woven-ecs/canvas-store'
import { EDITING_PLUGIN_NAME } from './constants'
import { CURSORS } from './cursors'
import { BlockPlacementState, DoubleClickState } from './singletons'
import { blockPlacementSystem, doubleClickCreateSystem, undoRedoSystem } from './systems'

export interface EditingPluginResources {
  store: CanvasStore
}

export interface EditingPluginOptions {
  store: CanvasStore
  doubleClickSnapshot?: string
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
    name: EDITING_PLUGIN_NAME,
    resources: { store: options.store } satisfies EditingPluginResources,
    singletons: [BlockPlacementState, DoubleClickState],
    systems: [blockPlacementSystem, doubleClickCreateSystem, undoRedoSystem],
    setup(ctx) {
      if (options.doubleClickSnapshot) {
        DoubleClickState.write(ctx).snapshot = options.doubleClickSnapshot
      }
    },
    cursors: CURSORS,
    fonts: DEFAULT_FONTS,
    keybinds: [
      { command: Undo.name, key: Key.Z, mod: true },
      { command: Redo.name, key: Key.Y, mod: true },
      { command: Redo.name, key: Key.Z, mod: true, shift: true },
    ],
  }
}
