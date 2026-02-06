import { field, type Context } from "@infinitecanvas/ecs";
import type { Vec2 } from "@infinitecanvas/math";
import { EditorSingletonDef } from "@infinitecanvas/ecs-sync";

const GridSchema = {
  /** Whether grid snapping is enabled */
  enabled: field.boolean().default(false),
  /** Width of each grid column in world units */
  colWidth: field.float64().default(20),
  /** Height of each grid row in world units */
  rowHeight: field.float64().default(20),
};

/**
 * Grid singleton - controls snap-to-grid behavior for block positioning and resizing.
 *
 * When enabled, blocks will snap to grid positions during:
 * - Dragging/moving blocks
 * - Resizing blocks
 *
 * The grid size is defined by `colWidth` and `rowHeight`.
 */
class GridDef extends EditorSingletonDef<typeof GridSchema> {
  constructor() {
    super({ name: "grid" }, GridSchema);
  }

  /**
   * Snap a position to the grid.
   * @param ctx - ECS context
   * @param position - Position to snap [x, y] (mutated in place)
   */
  snapPosition(ctx: Context, position: Vec2): void {
    const grid = this.read(ctx);
    if (!grid.enabled) return;

    position[0] = Math.round(position[0] / grid.colWidth) * grid.colWidth;
    position[1] = Math.round(position[1] / grid.rowHeight) * grid.rowHeight;
  }

  /**
   * Snap a size to the grid (minimum one grid cell).
   * @param ctx - ECS context
   * @param size - Size to snap [width, height] (mutated in place)
   */
  snapSize(ctx: Context, size: Vec2): void {
    const grid = this.read(ctx);
    if (!grid.enabled) return;

    size[0] = Math.max(
      grid.colWidth,
      Math.round(size[0] / grid.colWidth) * grid.colWidth
    );
    size[1] = Math.max(
      grid.rowHeight,
      Math.round(size[1] / grid.rowHeight) * grid.rowHeight
    );
  }

  /**
   * Snap a value to the grid column width.
   * @param ctx - ECS context
   * @param value - Value to snap
   * @returns Snapped value, or original if grid disabled
   */
  snapX(ctx: Context, value: number): number {
    const grid = this.read(ctx);
    if (!grid.enabled) return value;

    return Math.round(value / grid.colWidth) * grid.colWidth;
  }

  /**
   * Snap a value to the grid row height.
   * @param ctx - ECS context
   * @param value - Value to snap
   * @returns Snapped value, or original if grid disabled
   */
  snapY(ctx: Context, value: number): number {
    const grid = this.read(ctx);
    if (!grid.enabled) return value;

    return Math.round(value / grid.rowHeight) * grid.rowHeight;
  }
}

export const Grid = new GridDef();
