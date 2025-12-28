import { defineEditorComponent } from "@infinitecanvas/editor";

/**
 * Hovered component - marks an entity as being hovered by the mouse.
 *
 * This is a marker component with no data fields.
 * Managed by the intersect system when the mouse is over a block.
 */
export const Hovered = defineEditorComponent("hovered", {}, { sync: "none" });
