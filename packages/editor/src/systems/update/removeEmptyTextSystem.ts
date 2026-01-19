import {
  defineQuery,
  removeEntity,
  type Context,
  isAlive,
} from "@infinitecanvas/ecs";

import { defineEditorSystem } from "../../EditorSystem";
import { Block, Edited, Text } from "../../components";
import { getBlockDef } from "../../helpers";

// Query tracking the Edited component to detect when editing ends
const editedTextsQuery = defineQuery((q) => q.with(Block, Text, Edited));

/**
 * Remove Empty Text System - deletes text blocks when they become empty.
 *
 * When editing ends (Edited component is removed), this system checks if:
 * 1. The entity has a Text component
 * 2. The text content is empty (no visible characters)
 * 3. The block definition has `removeWhenTextEmpty: true`
 *
 * If all conditions are met, the entity is deleted.
 */
export const removeEmptyTextSystem = defineEditorSystem(
  { phase: "update" },
  (ctx: Context) => {
    // Check entities that just stopped being edited
    for (const entityId of editedTextsQuery.removed(ctx)) {
      // Check if text content is empty
      if (isAlive(ctx, entityId) && Text.hasContent(ctx, entityId)) {
        continue;
      }

      // Get the block definition to check removeWhenTextEmpty option
      const block = Block.read(ctx, entityId);
      const blockDef = getBlockDef(ctx, block.tag);

      if (blockDef.editOptions.removeWhenTextEmpty) {
        removeEntity(ctx, entityId);
      }
    }
  },
);
