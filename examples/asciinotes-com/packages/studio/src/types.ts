import type { Effect, Group, Page, Part, Tile } from '@prisma/client';
import type { BaseBrush } from '@scrolly-page/brushes';
import { BrushKinds } from '@scrolly-page/brushes';
import type { Viewport } from 'pixi-viewport';
import type { Application, Container } from 'pixi.js';
import type { Emitter } from 'strict-event-emitter';

export { BrushKinds } from '@scrolly-page/brushes';
export { Tag } from '@scrolly-page/shared';

// export type Transform = [number, number, number, number, number, number, number];

export type AABB = [number, number, number, number];

export enum PointerAction {
  None = 'none',
  Interact = 'interact',
  Pan = 'pan',
  TouchOnlyPan = 'touch-pan',
  Draw = 'draw',
}

export enum WheelAction {
  None = 'none',
  Zoom = 'zoom',
  Scroll = 'scroll',
}

export interface SiteLimits {
  partsCount: number;
}

export interface InputSettings {
  actionLeftMouse: PointerAction;
  actionMiddleMouse: PointerAction;
  actionRightMouse: PointerAction;
  actionWheel: WheelAction;
  actionModWheel: WheelAction;
}

export const defaultInputSettings: InputSettings = {
  actionLeftMouse: PointerAction.Interact,
  actionMiddleMouse: PointerAction.Pan,
  actionRightMouse: PointerAction.Pan,
  actionWheel: WheelAction.Scroll,
  actionModWheel: WheelAction.Zoom,
};

export enum SnapLineKind {
  TopTop = 'top-top',
  TopBottom = 'top-bottom',
  BottomTop = 'bottom-top',
  BottomBottom = 'bottom-bottom',

  LeftLeft = 'left-left',
  LeftRight = 'left-right',
  RightLeft = 'right-left',
  RightRight = 'right-right',

  TopX = 'top-x',
  BottomX = 'bottom-x',
  XX = 'x-x',
  XTop = 'x-top',
  XBottom = 'x-bottom',

  LeftY = 'left-y',
  RightY = 'right-y',
  YY = 'y-y',
  YLeft = 'y-left',
  YRight = 'y-right',

  Rotate = 'rotate',
}

export enum CursorKind {
  Auto = 'auto',
  Poiner = 'pointer',
  Crosshair = 'crosshair',
  Move = 'move',
  NESW = 'nesw-resize',
  NWSE = 'nwse-resize',
  NS = 'ns-resize',
  EW = 'ew-resize',
  NW = 'nw-resize',
  NE = 'ne-resize',
  SE = 'se-resize',
  SW = 'sw-resize',
}

export enum TransformHandleKind {
  TopRightScale = 'top-right-scale',
  BottomRightScale = 'bottom-right-scale',
  BottomLeftScale = 'bottom-left-scale',
  TopLeftScale = 'top-left-scale',
  TopScale = 'top-scale',
  RightScale = 'right-scale',
  BottomScale = 'bottom-scale',
  LeftScale = 'left-scale',
  RightStretch = 'right-stretch',
  LeftStretch = 'left-stretch',
  TopStretch = 'top-stretch',
  BottomStretch = 'bottom-stretch',
  RotateTopLeft = 'rotate-top-left',
  RotateTopRight = 'rotate-top-right',
  RotateBottomRight = 'rotate-bottom-right',
  RotateBottomLeft = 'rotate-bottom-left',
}

export interface Brush {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  kind: BrushKinds;
  size: number;
}

export const defaultBrush: Brush = {
  size: 20,
  red: 255,
  green: 0,
  blue: 0,
  alpha: 255,
  kind: BrushKinds.Marker,
};

export enum BufferZoneKind {
  Positive = 'positive',
  Negative = 'negative',
}

export enum LayerKind {
  Drawing = 'drawing',
  Block = 'block',
  Selection = 'selection',
}
export interface Layer {
  kind: LayerKind;
  opacity: number;
  active: boolean;
}

export const defaultLayers: Layer[] = [
  { kind: LayerKind.Drawing, opacity: 1, active: true },
  { kind: LayerKind.Block, opacity: 1, active: true },
  { kind: LayerKind.Selection, opacity: 1, active: true },
];

export interface StudioOptions {
  page: Page;
  inputSettings: InputSettings;
  blocks: Part[];
  groups: Group[];
  effects: Effect[];
  tiles: Tile[];
  layers: Layer[];
  brush: Brush;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Events = {
  'snapshot:move-state': [string];

  'world:update-cursor': [Partial<Part>];
  'world:update-brush': [Partial<Brush>];
  'world:update-site-limits': [SiteLimits];
  'world:update-input-settings': [InputSettings];
  'world:update-layer': [Layer];
  'world:update-part': [Part];
  'world:update-part-without-snapshot': [Part];
  'world:update-page': [Partial<Page>];
  'world:center-viewport': [];
  'world:create-snapshot': [];
  'world:start-inner-edit': [];
  'world:cancel-inner-edit': [];
  'world:finish-inner-edit': [];
  'world:deselect-all': [];
  'world:group-selected-parts': [];
  'world:ungroup-selected-parts': [];
  'world:delete-selected-parts': [];
  'world:bring-selected-parts-forward': [];
  'world:send-selected-parts-backward': [];
  'world:duplicate-selected-parts': [];
  'world:undo': [];
  'world:redo': [];

  'world:add-effect': [Effect];
  'world:update-effect': [Effect];
  'world:update-effect-no-shapshot': [Effect];
  'world:remove-effect': [Effect];

  'parts:add': [Part[]];
  'parts:update': [Part[]];
  'parts:remove': [Part[]];
  'parts:hover': [Part[]];
  'parts:unhover': [Part[]];
  'parts:select': [Part[]];
  'parts:unselect': [Part[]];
  'parts:dragged': [Part[]];
  'parts:undragged': [Part[]];
  'parts:edited': [Part[]];
  'parts:unedited': [Part[]];
  'parts:typed': [Part[]];
  'parts:untyped': [Part[]];

  'groups:add': [Group[]];
  'groups:update': [Group[]];
  'groups:remove': [Group[]];

  'effects:add': [Effect[]];
  'effects:update': [Effect[]];
  'effects:remove': [Effect[]];

  'tiles:add': [Tile[]];
  'tiles:update': [Tile[]];
  'tiles:remove': [Tile[]];
};

export interface Extents {
  left: number;
  top: number;
  width: number;
  height: number;
}

export enum RailKind {
  Center = 'center',
  MinPositive = 'min-positive',
  MaxPositive = 'max-positive',
  MinNegative = 'min-negative',
  MaxNegative = 'max-negative',
}

export interface StateSnapshot {
  page: Page;
  parts: Record<string, Part>;
  groups: Record<string, Group>;
  effects: Record<string, Effect>;
  tiles: Record<string, Tile>;
}

export interface StateDelta {
  addedParts: Part[];
  removedParts: Part[];
  updatedParts: Part[];

  addedEffects: Effect[];
  removedEffects: Effect[];
  updatedEffects: Effect[];

  addedGroups: Group[];
  removedGroups: Group[];
  updatedGroups: Group[];

  addedTiles: Tile[];
  removedTiles: Tile[];
  updatedTiles: Tile[];
}

export const defaultStateDelta: StateDelta = {
  addedParts: [],
  removedParts: [],
  updatedParts: [],

  addedEffects: [],
  removedEffects: [],
  updatedEffects: [],

  addedGroups: [],
  removedGroups: [],
  updatedGroups: [],

  addedTiles: [],
  removedTiles: [],
  updatedTiles: [],
};

export interface Resources {
  container: HTMLElement;
  emitter: Emitter<Events>;
  app?: Application;
  viewport?: Viewport;
  tileContainer?: Container;
  brushInstances?: Map<BrushKinds, BaseBrush>;
}
