import { field, defineEditorComponent } from "@infinitecanvas/editor";

/**
 * User component - tracks user presence on the canvas.
 *
 * Used to identify who is currently viewing the document.
 * Additional user details (name, avatar, etc.) can be fetched via API using this id.
 */
export const User = defineEditorComponent(
  "user",
  {
    id: field.string().max(36),
  },
  { sync: "ephemeral" }
);
