import { type EditorPlugin, Color, Text } from "@infinitecanvas/editor";

import { CURSORS } from "./cursors";
import { blockPlacementSystem } from "./systems";

export const BasicsPlugin: EditorPlugin = {
  name: "basics",

  cursors: CURSORS,

  blockDefs: [
    {
      tag: "sticky-note",
      components: [Color],
    },
    {
      tag: "text",
      components: [Text],
      resizeMode: 'text',
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
