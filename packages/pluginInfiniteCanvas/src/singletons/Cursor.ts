import { field, EditorSingletonDef, type Context } from "@infinitecanvas/editor";

const CursorSchema = {
  /** Base cursor SVG (from current tool) */
  svg: field.string().max(2048).default(""),
  /** Context-specific cursor SVG (overrides svg when set) */
  contextSvg: field.string().max(2048).default(""),
};

/**
 * Cursor singleton - manages the current cursor appearance.
 *
 * - `svg`: The default cursor from the active tool
 * - `contextSvg`: Temporary override cursor (e.g., during drag operations)
 *
 * When contextSvg is set, it takes precedence over svg.
 */
class CursorDef extends EditorSingletonDef<typeof CursorSchema> {
  constructor() {
    super("cursor", CursorSchema, { sync: "none" });
  }

  /**
   * Get the effective cursor SVG (contextSvg if set, otherwise svg).
   */
  getEffective(ctx: Context): string {
    const cursor = this.read(ctx);
    return cursor.contextSvg || cursor.svg;
  }

  /**
   * Set the base cursor SVG.
   */
  setSvg(ctx: Context, svg: string): void {
    this.write(ctx).svg = svg;
  }

  /**
   * Set the context cursor SVG (temporary override).
   */
  setContextSvg(ctx: Context, contextSvg: string): void {
    this.write(ctx).contextSvg = contextSvg;
  }

  /**
   * Clear the context cursor SVG.
   */
  clearContextSvg(ctx: Context): void {
    this.write(ctx).contextSvg = "";
  }
}

export const Cursor = new CursorDef();
