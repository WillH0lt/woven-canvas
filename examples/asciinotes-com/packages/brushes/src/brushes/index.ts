import type * as PIXI from 'pixi.js';
import { BrushKinds } from './types.js';

import BaseBrush from './BaseBrush.js';
import CrayonBrush from './crayon/CrayonBrush.js';
import EraserBrush from './eraser/EraserBrush.js';
import MarkerBrush from './marker/MarkerBrush.js';
import PaintBrush from './paint/PaintBrush.js';

export { BaseBrush, CrayonBrush, MarkerBrush, PaintBrush };
export const Brushes: Record<
  Exclude<BrushKinds, BrushKinds.None>,
  new (app: PIXI.Application) => BaseBrush
> = Object.freeze({
  [BrushKinds.Crayon]: CrayonBrush,
  [BrushKinds.Marker]: MarkerBrush,
  [BrushKinds.Paint]: PaintBrush,
  [BrushKinds.Eraser]: EraserBrush,
});

export * from './types.js';
