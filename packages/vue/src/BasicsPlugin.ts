import {
  type EditorPlugin,
  type FontFamilyInput,
  Color,
  Text,
  VerticalAlign,
  Image,
  Asset,
  Undo,
  Redo,
  Key,
} from "@infinitecanvas/editor";

import { type EditorSync } from "@infinitecanvas/ecs-sync";
import { CURSORS } from "./cursors";
import { blockPlacementSystem, undoRedoSystem } from "./systems";
import { BlockPlacementState } from "./singletons";

export interface BasicsPluginResources {
  store: EditorSync;
}

export interface BasicsPluginOptions {
  store: EditorSync;
}

export const DEFAULT_FONTS: FontFamilyInput[] = [
  {
    name: "Figtree",
    displayName: "Figtree",
    url: "https://fonts.googleapis.com/css2?family=Figtree",
    previewImage:
      "https://storage.googleapis.com/scrolly-page-fonts/Figtree.png",
  },
  {
    name: "Shantell Sans",
    displayName: "Shantell Sans",
    url: "https://fonts.googleapis.com/css2?family=Shantell+Sans",
    previewImage:
      "https://storage.googleapis.com/scrolly-page-fonts/ShantellSans.png",
  },
  {
    name: "Courier Prime",
    displayName: "Courier Prime",
    url: "https://fonts.googleapis.com/css2?family=Courier+Prime",
    previewImage:
      "https://storage.googleapis.com/scrolly-page-fonts/CourierPrime.png",
  },
  {
    name: "EB Garamond",
    displayName: "EB Garamond",
    url: "https://fonts.googleapis.com/css2?family=EB+Garamond",
    previewImage:
      "https://storage.googleapis.com/scrolly-page-fonts/EBGaramond.png",
  },
];

export function BasicsPlugin(options: BasicsPluginOptions): EditorPlugin {
  return {
    name: "basics",
    resources: { store: options.store } satisfies BasicsPluginResources,
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
        tag: "sticky-note",
        components: [Color, Text, VerticalAlign],
        editOptions: {
          canEdit: true,
        },
      },
      {
        tag: "text",
        components: [Text],
        resizeMode: "text",
        editOptions: {
          canEdit: true,
          removeWhenTextEmpty: true,
        },
      },
      {
        tag: "image",
        components: [Image, Asset],
        resizeMode: "scale",
      },
    ],
    systems: [blockPlacementSystem, undoRedoSystem],
  };
}
