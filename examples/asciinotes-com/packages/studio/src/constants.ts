import { BrushKinds } from '@scrolly-page/brushes';
import { LexoRank } from 'lexorank';

const maxRank = LexoRank.max().toString();

// ranks
export const SELECTION_BOX_RANK = maxRank;
export const TRANSFORM_HANDLE_CORNER_RANK = maxRank;
export const TRANSFORM_BOX_RANK = LexoRank.parse(maxRank).genPrev().toString();
export const ROTATE_HANDLE_RANK = LexoRank.parse(TRANSFORM_HANDLE_CORNER_RANK).genPrev().toString();
export const TRANSFORM_HANDLE_EDGE_RANK = LexoRank.parse(ROTATE_HANDLE_RANK).genPrev().toString();
// export const TRANSFORM_BOX_RANK = LexoRank.parse(TRANSFORM_HANDLE_EDGE_RANK).genPrev().toString();

// export const RAIL_HANDLE_RANK = maxRank;
export const BUFFER_ZONE_RANK = maxRank;
export const SNAP_LINE_RANK = LexoRank.parse(maxRank).genPrev().toString();
export const RAIL_RANK = LexoRank.parse(SNAP_LINE_RANK).genPrev().toString();

// editor settings
export const SNAP_RANGE = 10;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 10;
export const TILE_WIDTH = 1024;
export const TILE_HEIGHT = 1024;
export const TILE_LOADING_CONCURRENCY = 8;
export const MAX_TILES = 250;
export const STUDIO_BRUSHES: Exclude<BrushKinds, BrushKinds.None>[] = [
  BrushKinds.Crayon,
  BrushKinds.Marker,
  // BrushKinds.Paint,
  BrushKinds.Eraser,
];
export const SCROLL_END_PADDING = 100;
