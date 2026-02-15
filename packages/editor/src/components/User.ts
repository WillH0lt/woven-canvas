import { field } from "@woven-ecs/core";
import { defineCanvasComponent } from "@woven-ecs/canvas-store";

/**
 * User component - tracks user presence on the canvas.
 *
 * Used to identify who is currently viewing the document.
 */
export const User = defineCanvasComponent(
  { name: "user", sync: "ephemeral" },
  {
    userId: field.string().max(36),
    sessionId: field.string().max(36),
    color: field.string().max(7),
    name: field.string().max(100),
    avatar: field.string().max(500),
    position: field.tuple(field.float32(), 2).default([0, 0]),
  },
);
