import {
  field,
  type Context,
  EditorStateDef,
} from "@infinitecanvas/editor";

import { PanStateValue } from "../types";

const PanStateSchema = {
  /** Current state of the pan state machine */
  state: field.string().max(16).default(PanStateValue.Idle),
  /** World X coordinate where pan started */
  panStartX: field.float64().default(0),
  /** World Y coordinate where pan started */
  panStartY: field.float64().default(0),
};

/**
 * Pan state singleton - stores the state machine state and context for panning.
 *
 * Uses EditorStateDef to simplify XState machine integration.
 */
class PanStateDef extends EditorStateDef<typeof PanStateSchema> {
  constructor() {
    super(PanStateSchema, { sync: "none" });
  }

  /** Get the pan start position as [x, y] */
  getPanStart(ctx: Context): [number, number] {
    const s = this.read(ctx);
    return [s.panStartX, s.panStartY];
  }
}

export const PanState = new PanStateDef();
