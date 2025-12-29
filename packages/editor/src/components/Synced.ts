import { field } from "@infinitecanvas/ecs";
import { EditorComponentDef } from "../EditorComponentDef";

/**
 * Synced marks an entity for sync with the store.
 *
 * Only entities with this component will have their events sent to the StoreAdapter.
 * The `id` field stores the entity's stable UUID used for storage and sync.
 *
 * @example
 * ```typescript
 * import { createEntity, addComponent } from "@infinitecanvas/ecs";
 * import { Synced } from "@infinitecanvas/editor";
 *
 * // Create a synced entity
 * const entityId = createEntity(ctx);
 * addComponent(ctx, entityId, Synced, {
 *   id: crypto.randomUUID(),
 * });
 *
 * // MyComponent changes will now be synced to the store
 * ```
 */
export const Synced = new EditorComponentDef(
  "synced",
  {
    /** The entity's stable UUID for storage and sync */
    id: field.string().max(36),
  },
  { sync: "document" }
);
