import { field, type Context, type EntityId } from "@woven-ecs/core";
import { CanvasComponentDef } from "@woven-ecs/canvas-store";

const ColorSchema = {
  red: field.uint8().default(0),
  green: field.uint8().default(0),
  blue: field.uint8().default(0),
  alpha: field.uint8().default(255),
};

/**
 * Color component - stores RGBA color values.
 *
 * Each channel is 0-255. Alpha defaults to 255 (fully opaque).
 */
class ColorDef extends CanvasComponentDef<typeof ColorSchema> {
  constructor() {
    super({ name: "color", sync: "document" }, ColorSchema);
  }

  /**
   * Convert a color to a hex string.
   */
  toHex(ctx: Context, entityId: EntityId): string {
    const { red, green, blue, alpha } = this.read(ctx, entityId);
    const rHex = red.toString(16).padStart(2, "0");
    const gHex = green.toString(16).padStart(2, "0");
    const bHex = blue.toString(16).padStart(2, "0");
    const aHex = alpha.toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}${aHex}`;
  }

  /**
   * Set color from a hex string.
   */
  fromHex(ctx: Context, entityId: EntityId, hex: string): void {
    const color = this.write(ctx, entityId);
    color.red = Number.parseInt(hex.slice(1, 3), 16);
    color.green = Number.parseInt(hex.slice(3, 5), 16);
    color.blue = Number.parseInt(hex.slice(5, 7), 16);
    color.alpha = hex.length > 7 ? Number.parseInt(hex.slice(7, 9), 16) : 255;
  }
}

export const Color = new ColorDef();
