import { field } from "@infinitecanvas/ecs";
import { defineEditorComponent } from "../EditorComponentDef";

/**
 * User component - tracks user presence on the canvas.
 *
 * Used to identify who is currently viewing the document.
 */
export const User = defineEditorComponent(
  "user",
  {
    userId: field.string().max(36),
    sessionId: field.string().max(36),
    color: field.string().max(7),
    name: field.string().max(100),
    avatar: field.string().max(500),
  },
  { sync: "ephemeral" }
);
