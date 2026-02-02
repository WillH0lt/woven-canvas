import { field } from "@infinitecanvas/ecs";
import { defineEditorComponent } from "@infinitecanvas/ecs-sync";
import { VerticalAlignment } from "../types";

/**
 * VerticalAlign component - controls vertical text alignment within a block.
 *
 * Values: "top", "center", "bottom"
 */
export const VerticalAlign = defineEditorComponent(
  { name: "verticalAlign", sync: "document" },
  {
    value: field.enum(VerticalAlignment).default(VerticalAlignment.Top),
  }
);
