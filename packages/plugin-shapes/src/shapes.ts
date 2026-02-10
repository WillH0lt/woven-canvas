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
    "M50,88 C20,60 0,40 0,25 C0,10 15,0 30,0 C40,0 50,10 50,20 C50,10 60,0 70,0 C85,0 100,10 100,25 C100,40 80,60 50,88 Z",
  arrow: "M0,35 L60,35 L60,0 L100,50 L60,100 L60,65 L0,65 Z",
  cloud:
    "M25,90 C10,90 0,80 0,65 C0,52 8,42 20,40 C20,20 35,5 55,5 C72,5 85,18 88,35 C95,35 100,42 100,52 C100,62 92,70 82,70 L82,90 Z",
  speech:
    "M15,0 L85,0 C93,0 100,7 100,15 L100,55 C100,63 93,70 85,70 L35,70 L20,100 L30,70 L15,70 C7,70 0,63 0,55 L0,15 C0,7 7,0 15,0 Z",
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
