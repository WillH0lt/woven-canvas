import { field } from "@infinitecanvas/ecs";
import { EditorComponentDef } from "../EditorComponentDef";

/**
 * Storable marks an entity for persistence and sync.
 *
 * Only entities with this component will have their events sent to the StoreAdapter.
 * The `id` field stores the entity's stable UUID used for storage and sync.
 *
 * @example
 * ```typescript
 * import { createEntity, addComponent } from "@infinitecanvas/ecs";
 * import { Storable } from "@infinitecanvas/editor";
 *
 * // Create a storable entity
 * const entityId = createEntity(ctx);
 * addComponent(ctx, entityId, Storable);
 * addComponent(ctx, entityId, MyComponent);
 *
 * // MyComponent changes will now be synced to the store
 * // Access the entity's UUID via Storable.read(ctx, entityId).id
 * ```
 */
export const Storable = new EditorComponentDef(
  "storable",
  {
    /** The entity's stable UUID for storage and sync */
    id: field.string().max(36),
  },
  { sync: "document" }
);
