import { defineEditorComponent } from "../EditorComponentDef";

/**
 * Hovered component - marks an entity as being hovered by the mouse.
 */
export const Hovered = defineEditorComponent("hovered", {}, { sync: "none" });
