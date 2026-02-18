import {
  Asset,
  Color,
  type EditorPlugin,
  type FontFamilyInput,
  Image,
  Key,
  Redo,
  Text,
  Undo,
  VerticalAlign,
} from '@woven-canvas/core'

import type { CanvasStore } from '@woven-ecs/canvas-store'
import { CURSORS } from './cursors'
import { Shape } from './Shape'
import { BlockPlacementState } from './singletons'
import { blockPlacementSystem, undoRedoSystem } from './systems'

export interface BasicsPluginResources {
  store: CanvasStore
}

export interface BasicsPluginOptions {
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

export function BasicsPlugin(options: BasicsPluginOptions): EditorPlugin {
  return {
    name: 'basics',
    resources: { store: options.store } satisfies BasicsPluginResources,
    components: [Shape],
    singletons: [BlockPlacementState],
    cursors: CURSORS,
    fonts: DEFAULT_FONTS,
    keybinds: [
      { command: Undo.name, key: Key.Z, mod: true },
      { command: Redo.name, key: Key.Y, mod: true },
      { command: Redo.name, key: Key.Z, mod: true, shift: true },
    ],
    blockDefs: [
      {
        tag: 'sticky-note',
        components: [Color, Text, VerticalAlign],
        editOptions: {
          canEdit: true,
        },
      },
      {
        tag: 'text',
        components: [Text],
        resizeMode: 'text',
        editOptions: {
          canEdit: true,
          removeWhenTextEmpty: true,
        },
      },
      {
        tag: 'image',
        components: [Image, Asset],
        resizeMode: 'scale',
      },
      {
        tag: 'shape',
        components: [Shape, Text, VerticalAlign],
        resizeMode: 'free',
        editOptions: {
          canEdit: true,
        },
      },
    ],
    systems: [blockPlacementSystem, undoRedoSystem],
  }
}
