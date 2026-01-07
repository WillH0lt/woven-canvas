import { Color, type InferComponentType } from "@infinitecanvas/editor";

type ColorData = InferComponentType<typeof Color.schema>;

export function rgbToHex(color: ColorData): string {
  const r = Math.round(color.red);
  const g = Math.round(color.green);
  const b = Math.round(color.blue);
  const a = Math.round(color.alpha);

  if (a < 255) {
    return (
      "#" +
      [r, g, b, a]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  } else {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }
}


export function hexToRgb(hex: string): ColorData | null {
  // Remove leading #
  hex = hex.replace(/^#/, "");

  let r: number, g: number, b: number, a: number = 255;
  
  if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16);
  } else {
    return null; // Invalid format
  }

  return { red: r, green: g, blue: b, alpha: a };
}