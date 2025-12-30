import { defineEditorComponent } from "../EditorComponentDef";

/**
 * SelectionBox component - marks an entity as the marquee selection box.
 *
 * The selection box is drawn when the user drags on empty canvas space
 * to select multiple blocks. It has an associated Block component for
 * its position/size.
 */
export const SelectionBox = defineEditorComponent(
  "selectionBox",
  {},
  { sync: "none" }
);
