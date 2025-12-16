import { field } from "@infinitecanvas/ecs";
import { EditorSingletonDef } from "../EditorSingletonDef";

const FrameSchema = {
  /** Current frame number (increments each tick) */
  number: field.uint32().default(0),
  /** Time since last frame in seconds */
  delta: field.float64().default(0),
  /** Timestamp of current frame in milliseconds (from performance.now()) */
  time: field.float64().default(0),
};

/**
 * Frame singleton - tracks frame timing information.
 *
 * Updated automatically at the start of each tick by the Editor.
 * Use this to access delta time for animations and physics calculations.
 *
 * @example
 * ```typescript
 * const mySystem = defineSystem((ctx) => {
 *   const frame = Frame.read(ctx);
 *   // Use frame.delta for time-based calculations
 *   position += velocity * frame.delta;
 * });
 * ```
 */
class FrameDef extends EditorSingletonDef<typeof FrameSchema> {
  constructor() {
    super(FrameSchema, { sync: "none" });
  }
}

export const Frame = new FrameDef();
