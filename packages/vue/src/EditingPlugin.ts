import { type EditorPlugin, type FontFamilyInput, Key, Redo, Undo } from '@woven-canvas/core'

import type { CanvasStore } from '@woven-ecs/canvas-store'
import { EDITING_PLUGIN_NAME } from './constants'
import { CURSORS } from './cursors'
import { BlockPlacementState, DoubleClickState, PlacementDrawState } from './singletons'
import { blockPlacementSystem, doubleClickCreateSystem, drawPlacementSystem, undoRedoSystem } from './systems'

export interface EditingPluginResources {
  store: CanvasStore
  /**
   * Reads the canvas creation defaults registry (`setDefaults`/`getDefaults` on
   * the WovenCanvas context). Exposed to ECS so the block-placement systems can
   * fill the fields a placement snapshot omits — e.g. the last-used font.
   */
  getDefaults?: (component: string) => Record<string, unknown>
}

export interface EditingPluginOptions {
  store: CanvasStore
  doubleClickSnapshot?: string
  getDefaults?: (component: string) => Record<string, unknown>
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
    resources: { store: options.store, getDefaults: options.getDefaults } satisfies EditingPluginResources,
    singletons: [BlockPlacementState, DoubleClickState, PlacementDrawState],
    systems: [blockPlacementSystem, drawPlacementSystem, doubleClickCreateSystem, undoRedoSystem],
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
