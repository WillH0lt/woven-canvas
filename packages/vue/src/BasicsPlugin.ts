import {
  type EditorPlugin,
  Color
} from "@infinitecanvas/editor";


export const BasicsPlugin: EditorPlugin = {
  name: 'basics',

  blockDefs: [
    {
      tag: "sticky-note",
      components: [Color]
    },
  ],
};
