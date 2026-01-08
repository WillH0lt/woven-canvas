import { type EditorPlugin, Color } from "@infinitecanvas/editor";

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
  ],

  systems: [
    // Update phase
    blockPlacementSystem,
  ],
};
