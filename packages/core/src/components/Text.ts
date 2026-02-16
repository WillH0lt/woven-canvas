import { field } from "@woven-ecs/core";
import { defineCanvasComponent } from "@woven-ecs/canvas-store";
import { TextAlignment } from "../types";

/**
 * Text component - stores text content and styling for text blocks.
 */
export const Text = defineCanvasComponent(
  { name: "text", sync: "document" },
  {
    /** HTML content (supports rich text formatting) */
    content: field.string().max(10000).default(""),
    /** Font size in pixels */
    fontSizePx: field.float64().default(24),
    /** Font family name */
    fontFamily: field.string().max(64).default("Figtree"),
    /** Line height multiplier */
    lineHeight: field.float64().default(1.2),
    /** Letter spacing in em units */
    letterSpacingEm: field.float64().default(0),
    /** Whether width is constrained (text wraps) */
    constrainWidth: field.boolean().default(true),
    /** Default text alignment for new paragraphs */
    defaultAlignment: field.enum(TextAlignment).default(TextAlignment.Left),
  },
);
