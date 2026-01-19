import {
  type EditorPlugin,
  type FontFamilyInput,
  Color,
  Text,
  VerticalAlign,
} from "@infinitecanvas/editor";

import { CURSORS } from "./cursors";
import { blockPlacementSystem } from "./systems";

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

export const BasicsPlugin: EditorPlugin = {
  name: "basics",

  cursors: CURSORS,

  fonts: DEFAULT_FONTS,

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
  ],

  systems: [
    // Update phase
    blockPlacementSystem,
  ],
};
