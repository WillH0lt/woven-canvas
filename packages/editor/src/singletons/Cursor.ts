import { field, type Context } from "@infinitecanvas/ecs";

import { EditorSingletonDef } from "@infinitecanvas/ecs-sync";

const CursorSchema = {
  /** Base cursor kind (from current tool) */
  cursorKind: field.string().max(64).default("select"),
  /** Base cursor rotation in radians */
  rotation: field.float64().default(0),
  /** Context-specific cursor kind (overrides cursorKind when set, e.g., during drag/hover) */
  contextCursorKind: field.string().max(64).default(""),
  /** Context cursor rotation in radians */
  contextRotation: field.float64().default(0),
};

/**
 * Cursor singleton - manages the current cursor appearance.
 *
 * Stores cursor kind and rotation, which are resolved to SVG at render time.
 * This allows cursor definitions to be changed dynamically.
 *
 * - `cursorKind`/`rotation`: The default cursor from the active tool
 * - `contextCursorKind`/`contextRotation`: Temporary override cursor (e.g., during drag operations)
 *
 * When contextCursorKind is set, it takes precedence over cursorKind.
 */
class CursorDef extends EditorSingletonDef<typeof CursorSchema> {
  constructor() {
    super({ name: "cursor" }, CursorSchema);
  }

  /**
   * Get the effective cursor kind and rotation (context if set, otherwise base).
   */
  getEffective(ctx: Context): { cursorKind: string; rotation: number } {
    const cursor = this.read(ctx);
    if (cursor.contextCursorKind) {
      return {
        cursorKind: cursor.contextCursorKind,
        rotation: cursor.contextRotation,
      };
    }
    return { cursorKind: cursor.cursorKind, rotation: cursor.rotation };
  }

  /**
   * Set the base cursor kind and rotation.
   */
  setCursor(ctx: Context, cursorKind: string, rotation: number = 0): void {
    const cursor = this.write(ctx);
    cursor.cursorKind = cursorKind;
    cursor.rotation = rotation;
  }

  /**
   * Set the context cursor kind and rotation (temporary override).
   */
  setContextCursor(
    ctx: Context,
    cursorKind: string,
    rotation: number = 0
  ): void {
    const cursor = this.write(ctx);
    cursor.contextCursorKind = cursorKind;
    cursor.contextRotation = rotation;
  }

  /**
   * Clear the context cursor.
   */
  clearContextCursor(ctx: Context): void {
    const cursor = this.write(ctx);
    cursor.contextCursorKind = "";
    cursor.contextRotation = 0;
  }
}

export const Cursor = new CursorDef();
