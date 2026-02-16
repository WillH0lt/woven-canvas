import { defineCanvasComponent, field } from "@infinitecanvas/core";
export const Shape = defineCanvasComponent({ name: "shape", sync: "document" }, {
    border: field.uint16().default(5),
});
