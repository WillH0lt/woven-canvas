import { field, defineEditorComponent } from "@infinitecanvas/editor";

/**
 * Opacity component - controls visibility of an entity.
 *
 * Value is 0-255 where 0 is fully transparent and 255 is fully opaque.
 * Used to temporarily hide transform boxes and handles during drag operations.
 */
export const Opacity = defineEditorComponent(
  "opacity",
  {
    value: field.uint8().default(255),
  },
  { sync: "none" }
);
