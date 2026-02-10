/**
 * Predefined SVG path strings for shapes.
 * All paths are defined in a 100x100 coordinate space for easy scaling.
 */
export const shapePaths: Record<string, string> = {
  rectangle: "M0,0 L100,0 L100,100 L0,100 Z",
  ellipse: "M50,0 A50,50 0 1,1 50,100 A50,50 0 1,1 50,0",
  triangle: "M50,0 L100,100 L0,100 Z",
  diamond: "M50,0 L100,50 L50,100 L0,50 Z",
  pentagon: "M50,0 L100,38.2 L80.9,100 L19.1,100 L0,38.2 Z",
  hexagon: "M50,0 L100,25 L100,75 L50,100 L0,75 L0,25 Z",
  star: "M50,0 L61.8,38.2 L100,38.2 L69.1,61.8 L80.9,100 L50,76.4 L19.1,100 L30.9,61.8 L0,38.2 L38.2,38.2 Z",
  heart:
    "M50,16 C44,7 37,0 26,0 11,0 0,12 0,28 0,60 16,65 50,100 84,65 100,60 100,28 100,12 89,0 74,0 63,0 56,7 50,16 Z",
  arrow: "M0,35 L60,35 L60,0 L100,50 L60,100 L60,65 L0,65 Z",
};

/**
 * Get the SVG path for a shape kind in 100x100 coordinate space.
 * Scaling is handled by the SVG viewBox.
 */
export function getShapePath(kind: string): string {
  return shapePaths[kind] ?? shapePaths.rectangle;
}

/**
 * Get the transform string for scaling a shape path.
 * Use this when you want to apply scaling via CSS/SVG transform instead of modifying the path.
 */
export function getShapeTransform(width: number, height: number): string {
  return `scale(${width / 100}, ${height / 100})`;
}
