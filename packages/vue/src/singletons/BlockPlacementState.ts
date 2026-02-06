import { field } from "@infinitecanvas/editor";
import { defineEditorSingleton } from "@infinitecanvas/ecs-sync";

/**
 * BlockPlacementState singleton - tracks state for the block placement system.
 *
 * Stores the checkpoint ID for squashing history when editing ends.
 */
export const BlockPlacementState = defineEditorSingleton(
  { name: "blockPlacementState" },
  {
    /** Checkpoint ID for squashing edited block history, or empty string if none */
    editedCheckpoint: field.string().default("").max(36),
  },
);
