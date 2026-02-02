import { defineEditorComponent } from "@infinitecanvas/ecs-sync";

/**
 * Edited component - marks an entity as currently being edited.
 *
 * When present, the block is in edit mode (e.g., text editing).
 * The transform box is hidden and click-through is disabled.
 */
export const Edited = defineEditorComponent({ name: "edited" }, {});
