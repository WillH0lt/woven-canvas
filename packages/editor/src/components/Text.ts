import { field, type Context, type EntityId } from "@infinitecanvas/ecs";
import { EditorComponentDef } from "../EditorComponentDef";

const TextSchema = {
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
};

/**
 * Text component - stores text content and styling for text blocks.
 *
 * Contains HTML content (supporting rich text formatting) and
 * typography settings like font size, family, and line height.
 */
class TextDef extends EditorComponentDef<typeof TextSchema> {
  constructor() {
    super("text", TextSchema, { sync: "document" });
  }

  /**
   * Check if text content has any visible text characters.
   * HTML tags like <strong></strong> without text are not considered content.
   */
  hasContent(ctx: Context, entityId: EntityId): boolean {
    const text = this.read(ctx, entityId);
    // Remove HTML tags and trim whitespace
    const stripped = text.content.replace(/<[^>]*>/g, "").trim();
    return stripped.length > 0;
  }

  /**
   * Get plain text content (HTML stripped).
   */
  getStringContent(ctx: Context, entityId: EntityId): string {
    const text = this.read(ctx, entityId);
    return text.content.replace(/<[^>]*>/g, "").trim();
  }
}

export const Text = new TextDef();
