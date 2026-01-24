import {
  type EditorResources,
  addComponent,
  removeComponent,
  hasComponent,
  getResources,
  isHeldByRemote,
  Held,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";

import { Selected } from "../components";

/**
 * Add Selected and Held components to an entity.
 * Does nothing if the entity already has the Selected component.
 * Does nothing if held by a remote user.
 * If already held by the local user (from dragging), only adds Selected.
 *
 * @param ctx - The ECS context
 * @param entityId - The entity to select
 */
export function selectBlock(ctx: Context, entityId: EntityId): void {
  if (hasComponent(ctx, entityId, Selected)) return;
  // Don't select if held by a remote user
  if (isHeldByRemote(ctx, entityId)) return;

  const { sessionId } = getResources<EditorResources>(ctx);
  addComponent(ctx, entityId, Selected, {});
  // Only add Held if not already held (might be held by us from dragging)
  if (!hasComponent(ctx, entityId, Held)) {
    addComponent(ctx, entityId, Held, { sessionId });
  }
}

/**
 * Remove Selected and Held components from an entity.
 *
 * @param ctx - The ECS context
 * @param entityId - The entity to deselect
 */
export function deselectBlock(ctx: Context, entityId: EntityId): void {
  if (!hasComponent(ctx, entityId, Selected)) return;

  removeComponent(ctx, entityId, Selected);
  removeComponent(ctx, entityId, Held);
}

