import { field, type Context } from "@infinitecanvas/ecs";
import type { Vec2 } from "@infinitecanvas/math";

import { EditorSingletonDef } from "../EditorSingletonDef";

const ScreenSchema = {
  /** Width of the editor element in pixels */
  width: field.float64().default(0),
  /** Height of the editor element in pixels */
  height: field.float64().default(0),
  /** Left offset of the editor element relative to the viewport */
  left: field.float64().default(0),
  /** Top offset of the editor element relative to the viewport */
  top: field.float64().default(0),
};

/**
 * Screen singleton - tracks the editor element's dimensions and position.
 *
 * Updated automatically via ResizeObserver when the element resizes.
 */
class ScreenDef extends EditorSingletonDef<typeof ScreenSchema> {
  constructor() {
    super("screen", ScreenSchema, { sync: "none" });
  }

  /** Get screen dimensions as [width, height] */
  getSize(ctx: Context): Vec2 {
    const s = this.read(ctx);
    return [s.width, s.height];
  }

  /** Get screen position as [left, top] */
  getPosition(ctx: Context): Vec2 {
    const s = this.read(ctx);
    return [s.left, s.top];
  }

  /** Get the center point of the screen */
  getCenter(ctx: Context): Vec2 {
    const s = this.read(ctx);
    return [s.left + s.width / 2, s.top + s.height / 2];
  }
}

export const Screen = new ScreenDef();
