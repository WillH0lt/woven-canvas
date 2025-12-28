import { defineEditorComponent } from "@infinitecanvas/editor";

/**
 * Locked component - prevents an entity from being edited or moved.
 *
 * When present, the entity cannot be dragged, resized, or rotated.
 * Used for both user-locked content and system-locked UI elements.
 */
export const Locked = defineEditorComponent("locked", {}, { sync: "document" });
