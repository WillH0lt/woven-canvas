/**
 * @infinitecanvas/plugin-shapes
 *
 * Shapes plugin for infinite canvas applications.
 *
 * Provides SVG polygon shapes with customizable styling:
 * - Various shape types (rectangle, ellipse, triangle, star, heart, etc.)
 * - Customizable fill color
 * - Customizable stroke color and width
 * - Support for text content inside shapes
 *
 * @example
 * ```typescript
 * import { Editor, CorePlugin } from '@infinitecanvas/editor';
 * import { ShapesPlugin } from '@infinitecanvas/plugin-shapes';
 *
 * const editor = new Editor({
 *   domElement: document.getElementById('canvas'),
 *   plugins: [ShapesPlugin],
 * });
 *
 * await editor.initialize();
 * editor.start();
 * ```
 *
 * @packageDocumentation
 */

// Plugin
export { ShapesPlugin, createShapesPlugin } from "./ShapesPlugin";
export type { ShapesPluginOptions } from "./ShapesPlugin";

// Types
export { ShapeKind, StrokeKind } from "./types";

// Components
export { Shape } from "./components";

// Shape data
export { getShapePath } from "./shapes";
