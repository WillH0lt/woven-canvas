import { field, defineEditorComponent } from "@infinitecanvas/editor";

/**
 * ArrowTrim component - stores trim parameters for arrow rendering.
 *
 * Used to trim arrow endpoints when they connect to blocks,
 * so arrows don't overlap with the connected shapes.
 *
 * Values are parametric (0-1) along the arrow path:
 * - tStart: Where the visible arrow starts (0 = beginning)
 * - tEnd: Where the visible arrow ends (1 = end)
 */
export const ArrowTrim = defineEditorComponent(
  "arrowTrim",
  {
    /** Parametric start position (0-1) */
    tStart: field.float64().default(0),

    /** Parametric end position (0-1) */
    tEnd: field.float64().default(1),
  },
  { sync: "none" }
);
