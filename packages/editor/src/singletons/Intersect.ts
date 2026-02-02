import { field, type Context, type EntityId } from "@infinitecanvas/ecs";
import { EditorSingletonDef } from "@infinitecanvas/ecs-sync";

const IntersectSchema = {
  // Store up to 5 intersected entity IDs
  entity1: field.ref(),
  entity2: field.ref(),
  entity3: field.ref(),
  entity4: field.ref(),
  entity5: field.ref(),
};

/**
 * Intersect singleton - stores the entities currently under the mouse cursor.
 *
 * Updated by the intersect system when the mouse moves.
 * Entities are stored in z-order (top to bottom).
 */
class IntersectDef extends EditorSingletonDef<typeof IntersectSchema> {
  constructor() {
    super({ name: "intersect" }, IntersectSchema);
  }

  /**
   * Get the topmost intersected entity.
   */
  getTop(ctx: Context): EntityId | null {
    return this.read(ctx).entity1;
  }

  /**
   * Get all intersected entities as an array.
   */
  getAll(ctx: Context): EntityId[] {
    const intersect = this.read(ctx);
    const result: EntityId[] = [];

    if (intersect.entity1 !== null) result.push(intersect.entity1);
    if (intersect.entity2 !== null) result.push(intersect.entity2);
    if (intersect.entity3 !== null) result.push(intersect.entity3);
    if (intersect.entity4 !== null) result.push(intersect.entity4);
    if (intersect.entity5 !== null) result.push(intersect.entity5);

    return result;
  }

  /**
   * Set intersected entities from an array.
   */
  setAll(ctx: Context, entities: EntityId[]): void {
    const intersect = this.write(ctx);
    intersect.entity1 = entities[0] ?? null;
    intersect.entity2 = entities[1] ?? null;
    intersect.entity3 = entities[2] ?? null;
    intersect.entity4 = entities[3] ?? null;
    intersect.entity5 = entities[4] ?? null;
  }

  /**
   * Clear all intersections.
   */
  clear(ctx: Context): void {
    const intersect = this.write(ctx);
    intersect.entity1 = null;
    intersect.entity2 = null;
    intersect.entity3 = null;
    intersect.entity4 = null;
    intersect.entity5 = null;
  }
}

export const Intersect = new IntersectDef();
