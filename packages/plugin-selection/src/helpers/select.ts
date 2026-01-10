import { Block, type EditorResources,   addComponent,
  hasComponent,
  getResources,
  defineQuery,
  type Context,
  type EntityId
} from "@infinitecanvas/editor";

import { Selected } from "../components";

// Query for selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected));

// Query for selected blocks with change tracking
const selectedBlocksTrackingQuery = defineQuery((q) =>
  q.with(Block).tracking(Selected)
);

/**
 * Add Selected component to an entity with the current session's ID.
 * Does nothing if the entity already has the Selected component.
 *
 * @param ctx - The ECS context
 * @param entityId - The entity to select
 */
export function selectBlock(ctx: Context, entityId: EntityId): void {
  if (hasComponent(ctx, entityId, Selected)) return;

  const { sessionId } = getResources<EditorResources>(ctx);
  addComponent(ctx, entityId, Selected, { selectedBy: sessionId });
}

/**
 * Filter an array of entities to only include those selected by the current session.
 *
 * @param ctx - The ECS context
 * @param entities - Array of entity IDs to filter
 * @returns Array of entity IDs that are selected by the current session
 */
export function filterLocalSelectedBlocks(
  ctx: Context,
  entities: EntityId[]
): EntityId[] {
  const { sessionId } = getResources<EditorResources>(ctx);

  const result: EntityId[] = [];
  for (const entityId of entities) {
    const selected = Selected.read(ctx, entityId);
    if (selected.selectedBy === sessionId) {
      result.push(entityId);
    }
  }
  return result;
}

/**
 * Get all blocks selected by the current session.
 * Filters out blocks selected by other users in collaborative environments.
 *
 * @param ctx - The ECS context
 * @returns Array of entity IDs selected by the current session
 */
export function getLocalSelectedBlocks(ctx: Context): EntityId[] {
  return filterLocalSelectedBlocks(ctx, [...selectedBlocksQuery.current(ctx)]);
}

/**
 * Get blocks that were just selected by the current session.
 * Uses tracking query to detect newly added Selected components.
 *
 * @param ctx - The ECS context
 * @returns Array of entity IDs that were just selected by the current session
 */
export function getAddedLocalSelectedBlocks(ctx: Context): EntityId[] {
  return filterLocalSelectedBlocks(ctx, [...selectedBlocksTrackingQuery.added(ctx)]);
}

/**
 * Get blocks that were just deselected by the current session.
 * Uses tracking query to detect recently removed Selected components.
 *
 * @param ctx - The ECS context
 * @returns Array of entity IDs that were just deselected by the current session
 */
export function getRemovedLocalSelectedBlocks(ctx: Context): EntityId[] {
  return filterLocalSelectedBlocks(ctx, [...selectedBlocksTrackingQuery.removed(ctx)]);
}

