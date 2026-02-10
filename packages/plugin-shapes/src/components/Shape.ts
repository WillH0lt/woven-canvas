import { field, EditorComponentDef } from "@infinitecanvas/editor";
import { ShapeKind, StrokeKind } from "../types";

const ShapeSchema = {
  /** The kind of shape to render */
  kind: field.enum(ShapeKind).default(ShapeKind.Rectangle),

  /** Stroke style */
  strokeKind: field.enum(StrokeKind).default(StrokeKind.Solid),

  /** Stroke width in pixels */
  strokeWidth: field.uint16().default(2),

  /** Stroke color - red component (0-255) */
  strokeRed: field.uint8().default(0),

  /** Stroke color - green component (0-255) */
  strokeGreen: field.uint8().default(0),

  /** Stroke color - blue component (0-255) */
  strokeBlue: field.uint8().default(0),

  /** Stroke color - alpha component (0-255) */
  strokeAlpha: field.uint8().default(255),

  /** Fill color - red component (0-255) */
  fillRed: field.uint8().default(255),

  /** Fill color - green component (0-255) */
  fillGreen: field.uint8().default(255),

  /** Fill color - blue component (0-255) */
  fillBlue: field.uint8().default(255),

  /** Fill color - alpha component (0-255) */
  fillAlpha: field.uint8().default(0),
};

/**
 * Shape component - defines the visual properties of a shape block.
 *
 * Includes shape type, stroke style/color/width, and fill color.
 */
class ShapeDef extends EditorComponentDef<typeof ShapeSchema> {
  constructor() {
    super({ name: "shape", sync: "document" }, ShapeSchema);
  }

  /**
   * Get the stroke color as a CSS rgba string.
   */
  getStrokeColor(
    strokeRed: number,
    strokeGreen: number,
    strokeBlue: number,
    strokeAlpha: number
  ): string {
    return `rgba(${strokeRed}, ${strokeGreen}, ${strokeBlue}, ${strokeAlpha / 255})`;
  }

  /**
   * Get the fill color as a CSS rgba string.
   */
  getFillColor(
    fillRed: number,
    fillGreen: number,
    fillBlue: number,
    fillAlpha: number
  ): string {
    return `rgba(${fillRed}, ${fillGreen}, ${fillBlue}, ${fillAlpha / 255})`;
  }

  /**
   * Get the stroke dash array for the stroke kind.
   */
  getStrokeDashArray(strokeKind: StrokeKind, strokeWidth: number): string {
    switch (strokeKind) {
      case StrokeKind.Dashed:
        return `${strokeWidth * 3} ${strokeWidth * 3}`;
      case StrokeKind.None:
        return "";
      case StrokeKind.Solid:
      default:
        return "";
    }
  }
}

export const Shape = new ShapeDef();
