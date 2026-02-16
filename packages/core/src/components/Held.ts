import { field } from "@woven-ecs/core";
import { defineCanvasComponent } from "@woven-ecs/canvas-store";

/**
 * Held component - marks an entity as being actively held by a user.
 *
 * When a block is selected or being dragged, the Held component is added
 * to indicate that another user should not interact with it. This prevents
 * conflicts when multiple users try to manipulate the same block.
 *
 * The `sessionId` field stores which user is holding this entity.
 * This syncs ephemerally so remote users can see what's being held.
 */
export const Held = defineCanvasComponent(
  { name: "held", sync: "ephemeral" },
  {
    sessionId: field.string().max(36).default(""),
  }
);
