// Re-export math types
export type { Vec2 } from '@woven-canvas/math'
export type {
  AnyCanvasComponentDef,
  AnyCanvasSingletonDef,
  InferCanvasComponentType,
  SingletonSyncBehavior,
  SyncBehavior,
} from '@woven-ecs/canvas-store'
// Re-export from ecs-sync
export {
  CanvasComponentDef,
  CanvasSingletonDef,
  defineCanvasComponent,
  defineCanvasSingleton,
  Synced,
} from '@woven-ecs/canvas-store'
// Re-export useful ECS utilities
export {
  addComponent,
  ComponentDef,
  type ComponentSchema,
  type Context,
  createEntity,
  defineQuery,
  defineSystem,
  type EntityId,
  EventType,
  field,
  getBackrefs,
  getResources,
  hasComponent,
  isAlive,
  MainThreadSystem,
  type QueryDef,
  removeComponent,
  removeEntity,
  SINGLETON_ENTITY_ID,
  type System,
} from '@woven-ecs/core'
// Plugin
export { createCorePlugin } from './CorePlugin'
// Command system
export {
  type CommandDef,
  CommandMarker,
  defineCommand,
  on,
  Redo,
  ResetKeyboard,
  Undo,
} from './command'
// Selection commands
// Transform box commands
// Frame containment commands
export {
  AddFrameHighlight,
  AddHeld,
  AddSelectionBox,
  AddTransformBox,
  AssignFrameChildren,
  BringForwardSelected,
  CloneEntities,
  DeselectAll,
  DeselectBlock,
  DragBlock,
  DuplicateSelected,
  EndTransformBoxEdit,
  HideTransformBox,
  PlaceBlockEvent,
  RemoveBlock,
  RemoveFrameHighlight,
  RemoveHeld,
  RemoveSelected,
  RemoveSelectionBox,
  RemoveTransformBox,
  SelectAll,
  SelectBlock,
  SendBackwardSelected,
  SetCursor,
  ShowTransformBox,
  StartTransformBoxEdit,
  ToggleSelect,
  UncloneEntities,
  UpdateSelectionBox,
  UpdateTransformBox,
} from './commands'
// Components
export {
  Aabb,
  Asset,
  Block,
  Color,
  Connector,
  DragStart,
  EditAfterPlacing,
  Edited,
  Embed,
  EmbedProvider,
  Frame,
  FrameDropTarget,
  Held,
  HitGeometry,
  Hovered,
  Image,
  Layer,
  MAX_HIT_ARCS,
  MAX_HIT_CAPSULES,
  MAX_HIT_POLYGON_POINTS,
  Opacity,
  Pointer,
  PointerButton,
  PointerType,
  ScaleWithZoom,
  Selected,
  SelectionBox,
  Shape,
  StrokeKind,
  Text,
  TransformBox,
  TransformHandle,
  UploadState,
  User,
  VerticalAlign,
} from './components'
// Constants
export { STRATUM_ORDER } from './constants'
// Cursors
export { CURSORS, CursorKind } from './cursors'
// Editor class
export { Editor, type QueryCallback } from './Editor'
// State machine singleton
export {
  defineEditorState,
  EditorStateDef,
  type InferStateContext,
  type StateSchema,
} from './EditorStateDef'
// Editor system
export {
  defineEditorSystem,
  type EditorSystem,
  type EditorSystemFunction,
  type EditorSystemOptions,
} from './EditorSystem'
// Events
export {
  clearPointerTrackingState,
  type FrameInput,
  getFrameInput,
  getKeyboardInput,
  getMouseInput,
  getPointerInput,
  type KeyboardInput,
  type KeyboardInputType,
  type MouseInput,
  type MouseInputType,
  // Types
  type PointerInput,
  type PointerInputOptions,
  type PointerInputType,
} from './events'
export type { FontFamily as FontFamilyType } from './FontLoader'
// Font loading
export { FontFamily, type FontFamilyInput, FontLoader } from './FontLoader'
// Helpers
export {
  canBlockEdit,
  canBlockInteract,
  cascadeDelete,
  compareBlockOrder,
  convertRefsToUuids,
  createBlock,
  deselectAll,
  deselectBlock,
  detectEmbedProvider,
  filterRoots,
  findFrameAtPoint,
  generateUuidBySeed,
  getBlockDef,
  getBlockResizeMode,
  getChildren,
  getDescendants,
  getEntityUuid,
  getRefFieldNames,
  getTopmostBlockAtPoint,
  getWorldPosition,
  intersectAabb,
  intersectCapsule,
  intersectPoint,
  isAncestor,
  isHeldByRemote,
  isLayerInteractive,
  resolveEmbedUrl,
  resolveLayerRank,
  resolveRefFields,
  type SortableBlock,
  selectAll,
  selectBlock,
  validateEmbedUrl,
  worldToLocal,
} from './helpers'
export type { CreateBlockInput } from './helpers/createBlock'
// State machine utilities
export { type MachineResult, runMachine } from './machine'
// Plugin system
export {
  type EditorPlugin,
  type EditorPluginFactory,
  type EditorPluginInput,
  parsePlugin,
} from './plugin'
// Singletons
export {
  Camera,
  Controls,
  Cursor,
  FrameContainmentState,
  Grid,
  Intersect,
  Key,
  Keyboard,
  Mouse,
  RankBounds,
  ScaleWithZoomState,
  Screen,
  ScrollEdgesStateSingleton,
  SelectionStateSingleton,
  Tick,
  TransformBoxStateSingleton,
} from './singletons'
// types
export type {
  BlockDefInput,
  ControlsOptionsInput,
  CorePluginOptionsInput,
  CursorDefMap,
  EditorOptionsInput,
  EditorResources,
  GridOptionsInput,
  KeybindInput,
  UserDataInput,
} from './types'
export {
  BlockDef,
  ControlsOptions,
  type CorePluginOptions,
  CorePluginOptionsSchema,
  CursorDef,
  FrameContainmentStateEnum,
  type FrameContainmentStateValue,
  GridOptions,
  getPluginResources,
  isReadonly,
  Keybind,
  ResizeMode,
  ScrollEdgesState,
  SelectionState,
  Stratum,
  TextAlignment,
  TransformBoxState,
  TransformHandleKind,
  UserData,
  VerticalAlignment,
} from './types'
