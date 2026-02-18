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
export { CorePlugin } from './CorePlugin'
// Command system
export {
  type CommandDef,
  CommandMarker,
  defineCommand,
  on,
  Redo,
  Undo,
} from './command'
// Components
export {
  Aabb,
  Asset,
  Block,
  Color,
  Connector,
  Edited,
  Held,
  HitGeometry,
  Hovered,
  Image,
  MAX_HIT_ARCS,
  MAX_HIT_CAPSULES,
  Opacity,
  Pointer,
  PointerButton,
  PointerType,
  ScaleWithZoom,
  Shape,
  StrokeKind,
  Text,
  UploadState,
  User,
  VerticalAlign,
} from './components'
// Constants
export { STRATUM_ORDER } from './constants'
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
  getBlockDef,
  getTopmostBlockAtPoint,
  intersectAabb,
  intersectCapsule,
  intersectPoint,
  isHeldByRemote,
} from './helpers'
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
  Frame,
  Grid,
  Intersect,
  Key,
  Keyboard,
  Mouse,
  RankBounds,
  ScaleWithZoomState,
  Screen,
} from './singletons'
// types
export type {
  BlockDefInput,
  CursorDefMap,
  EditorOptionsInput,
  EditorResources,
  GridOptionsInput,
  KeybindInput,
  ResizeMode,
  UserDataInput,
} from './types'
export {
  BlockDef,
  CursorDef,
  GridOptions,
  getPluginResources,
  Keybind,
  Stratum,
  TextAlignment,
  UserData,
  VerticalAlignment,
} from './types'
