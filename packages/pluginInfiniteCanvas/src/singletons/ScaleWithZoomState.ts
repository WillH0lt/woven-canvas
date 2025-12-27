import { field, defineEditorSingleton } from "@infinitecanvas/editor";

/**
 * ScaleWithZoomState singleton - tracks state for the ScaleWithZoom system.
 *
 * Stores the last zoom level so the system can detect when zoom changes
 * and update all ScaleWithZoom entities accordingly.
 */
export const ScaleWithZoomState = defineEditorSingleton(
  "scaleWithZoomState",
  {
    /** Last processed zoom level */
    lastZoom: field.float64().default(1),
  },
  { sync: "none" }
);
