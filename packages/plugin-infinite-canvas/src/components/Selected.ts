import { field, defineEditorComponent } from "@infinitecanvas/editor";

/**
 * Selected component - marks an entity as selected.
 *
 * The `selectedBy` field stores the user ID who selected this entity,
 * enabling multi-user selection in collaborative environments.
 */
export const Selected = defineEditorComponent(
  "selected",
  {
    selectedBy: field.string().max(36).default(""),
  },
  { sync: "ephemeral" }
);
