import { field } from "@infinitecanvas/ecs";
import { defineEditorComponent } from "@infinitecanvas/ecs-sync";

/**
 * User component - tracks user presence on the canvas.
 *
 * Used to identify who is currently viewing the document.
 */
export const User = defineEditorComponent(
  { name: "user", sync: "ephemeral" },
  {
    userId: field.string().max(36),
    sessionId: field.string().max(36),
    color: field.string().max(7),
    name: field.string().max(100),
    avatar: field.string().max(500),
  }
);
