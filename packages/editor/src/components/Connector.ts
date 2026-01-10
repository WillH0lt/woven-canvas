import { field } from "@infinitecanvas/ecs";
import { defineEditorComponent } from "../EditorComponentDef";

/**
 * Connector component - defines a line/arrow between two blocks.
 *
 * Connectors link two blocks together with optional anchor points.
 * When connected blocks move, the connector endpoints update automatically.
 *
 * - `startBlockId`/`endBlockId`: UUIDs of connected blocks (empty = free endpoint)
 * - `startBlockUv`/`endBlockUv`: Anchor point on block in UV coords (0-1)
 * - `startUv`/`endUv`: Actual endpoint position as UV coords on this connector's block
 * - `startNeedsUpdate`/`endNeedsUpdate`: Flags to trigger recalculation
 */
export const Connector = defineEditorComponent(
  "connector",
  {
    startBlockId: field.string().max(36).default(""),
    startBlockUv: field.tuple(field.float64(), 2).default([0, 0]),
    startUv: field.tuple(field.float64(), 2).default([0, 0]),
    startNeedsUpdate: field.boolean().default(false),

    endBlockId: field.string().max(36).default(""),
    endBlockUv: field.tuple(field.float64(), 2).default([0, 0]),
    endUv: field.tuple(field.float64(), 2).default([1, 1]),
    endNeedsUpdate: field.boolean().default(false),
  },
  { sync: "document" }
);
