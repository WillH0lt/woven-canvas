import { field, type Context } from "@infinitecanvas/ecs";
import type { Vec2 } from "@infinitecanvas/math";
import { EditorSingletonDef } from "@infinitecanvas/ecs-sync";

const GridSchema = {
  /** Whether grid snapping is enabled */
  enabled: field.boolean().default(false),
  /** Whether resized/rotated objects must stay aligned to the grid */
  strict: field.boolean().default(false),
  /** Width of each grid column in world units */
  colWidth: field.float64().default(20),
  /** Height of each grid row in world units */
  rowHeight: field.float64().default(20),
  /** Angular snap increment in radians when grid is enabled */
  snapAngleRad: field.float64().default(Math.PI / 36),
  /** Angular snap increment in radians when shift key is held */
  shiftSnapAngleRad: field.float64().default(Math.PI / 12),
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

    if (grid.colWidth !== 0) {
      position[0] = Math.round(position[0] / grid.colWidth) * grid.colWidth;
    }
    if (grid.rowHeight !== 0) {
      position[1] = Math.round(position[1] / grid.rowHeight) * grid.rowHeight;
    }
  }

  /**
   * Snap a size to the grid (minimum one grid cell).
   * @param ctx - ECS context
   * @param size - Size to snap [width, height] (mutated in place)
   */
  snapSize(ctx: Context, size: Vec2): void {
    const grid = this.read(ctx);
    if (!grid.enabled) return;

    if (grid.colWidth !== 0) {
      size[0] = Math.max(
        grid.colWidth,
        Math.round(size[0] / grid.colWidth) * grid.colWidth
      );
    }
    if (grid.rowHeight !== 0) {
      size[1] = Math.max(
        grid.rowHeight,
        Math.round(size[1] / grid.rowHeight) * grid.rowHeight
      );
    }
  }

  /**
   * Snap a value to the grid column width.
   * @param ctx - ECS context
   * @param value - Value to snap
   * @returns Snapped value, or original if grid disabled
   */
  snapX(ctx: Context, value: number): number {
    const grid = this.read(ctx);
    if (!grid.enabled || grid.colWidth === 0) return value;

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
    if (!grid.enabled || grid.rowHeight === 0) return value;

    return Math.round(value / grid.rowHeight) * grid.rowHeight;
  }
}

export const Grid = new GridDef();
