import { field, defineEditorComponent } from "@infinitecanvas/editor";

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
    startBlockUvX: field.float64().default(0),
    startBlockUvY: field.float64().default(0),
    startUvX: field.float64().default(0),
    startUvY: field.float64().default(0),
    startNeedsUpdate: field.boolean().default(false),

    endBlockId: field.string().max(36).default(""),
    endBlockUvX: field.float64().default(0),
    endBlockUvY: field.float64().default(0),
    endUvX: field.float64().default(1),
    endUvY: field.float64().default(1),
    endNeedsUpdate: field.boolean().default(false),
  },
  { sync: "document" }
);
