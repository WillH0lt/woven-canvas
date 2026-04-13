import {
  type AnyCanvasComponentDef,
  type AnyCanvasSingletonDef,
  CanvasComponentDef,
  CanvasSingletonDef,
} from '@woven-ecs/canvas-store'
import { getResources } from '@woven-ecs/core'
import { BringForwardSelected, RemoveSelected, SelectAll, SendBackwardSelected } from './commands'
import * as components from './components'
import {
  Asset,
  Color,
  Embed,
  Frame,
  Image,
  SelectionBox,
  Shape,
  Text,
  TransformBox,
  TransformHandle,
  VerticalAlign,
} from './components'
import { CORE_PLUGIN_NAME } from './constants'
import { CURSORS } from './cursors'
import type { EditorPlugin } from './plugin'
import * as singletons from './singletons'
import { Key } from './singletons/Keyboard'
import { captureFrameContainmentSystem, keybindSystem } from './systems/capture'
import { hoverCursorSystem } from './systems/capture/hoverCursorSystem'
import { scrollEdgesSystem } from './systems/capture/scrollEdgesSystem'
import { transformBoxSystem as captureTransformBoxSystem } from './systems/capture/transformBoxSystem'
import {
  attachKeyboardListeners,
  attachMouseListeners,
  attachPointerListeners,
  attachScreenObserver,
  detachKeyboardListeners,
  detachMouseListeners,
  detachPointerListeners,
  detachScreenObserver,
  keyboardSystem,
  mouseSystem,
  pointerSystem,
  screenSystem,
  tickSystem,
} from './systems/input'
import { cursorSystem, presenceSystem } from './systems/postRender'
import { transformBoxSystem as postUpdateTransformBoxSystem } from './systems/postUpdate/transformBoxSystem'
import { intersectSystem } from './systems/preCapture'
import { selectSystem as preCaptureSelectSystem } from './systems/preCapture/selectSystem'
import { rankBoundsSystem } from './systems/preInput'
import { canSeeBlocksSystem, scaleWithZoomSystem } from './systems/preRender'
import { updateFrameContainmentSystem, updateFrameSetupSystem } from './systems/update'
import { blockSystem } from './systems/update/blockSystem'
import { dragHandlerSystem } from './systems/update/dragHandlerSystem'
import { selectSystem as updateSelectSystem } from './systems/update/selectSystem'
import {
  type CorePluginOptions,
  type CorePluginOptionsInput,
  CorePluginOptionsSchema,
  type EditorResources,
  ResizeMode,
} from './types'

/**
 * Create the core plugin with the given options.
 */
export function createCorePlugin(options: CorePluginOptionsInput = {}): EditorPlugin<CorePluginOptions> {
  const parsedOptions = CorePluginOptionsSchema.parse(options)

  return {
    name: CORE_PLUGIN_NAME,

    resources: parsedOptions,

    singletons: Object.values(singletons).filter((v) => v instanceof CanvasSingletonDef) as AnyCanvasSingletonDef[],

    components: Object.values(components).filter((v) => v instanceof CanvasComponentDef) as AnyCanvasComponentDef[],

    blockDefs: [
      {
        tag: 'sticky-note',
        components: [Color, Text, VerticalAlign],
        editOptions: {
          canEdit: true,
        },
      },
      {
        tag: 'text',
        components: [Text],
        resizeMode: ResizeMode.Text,
        editOptions: {
          canEdit: true,
          removeWhenTextEmpty: true,
        },
      },
      {
        tag: 'image',
        components: [Image, Asset],
        resizeMode: ResizeMode.Scale,
      },
      {
        tag: 'shape',
        components: [Shape, Text, VerticalAlign],
        resizeMode: ResizeMode.Free,
        editOptions: {
          canEdit: true,
        },
      },
      {
        tag: 'embed',
        components: [Embed],
        resizeMode: ResizeMode.Free,
        editOptions: {
          canEdit: true,
        },
      },
      // Frame block def
      {
        tag: 'frame',
        components: [Frame],
        resizeMode: ResizeMode.Free,
        canRotate: false,
        connectors: {
          enabled: false,
        },
      },
      // Selection overlay block defs
      {
        tag: 'selection-box',
        stratum: 'overlay',
        canRotate: false,
        canScale: false,
        components: [SelectionBox],
      },
      {
        tag: 'transform-box',
        stratum: 'overlay',
        canRotate: false,
        canScale: false,
        components: [TransformBox],
      },
      {
        tag: 'transform-handle',
        stratum: 'overlay',
        canRotate: false,
        canScale: false,
        components: [TransformHandle],
      },
      {
        tag: 'transform-edge',
        stratum: 'overlay',
        canRotate: false,
        canScale: false,
        components: [TransformHandle],
      },
      {
        tag: 'transform-rotate',
        stratum: 'overlay',
        canRotate: false,
        canScale: false,
        components: [TransformHandle],
      },
    ],

    systems: [
      // Input phase
      tickSystem, // priority: 100
      rankBoundsSystem, // priority: 100
      keyboardSystem,
      mouseSystem,
      screenSystem,
      pointerSystem,

      // Capture phase
      intersectSystem, // priority: 100
      preCaptureSelectSystem, // priority: 100
      keybindSystem,
      hoverCursorSystem,
      scrollEdgesSystem,
      captureTransformBoxSystem,
      captureFrameContainmentSystem,

      // Update phase
      updateFrameContainmentSystem,
      updateFrameSetupSystem,
      blockSystem,
      dragHandlerSystem,
      updateSelectSystem,
      postUpdateTransformBoxSystem,

      // Render phase
      scaleWithZoomSystem, // priority: 100
      canSeeBlocksSystem, // priority: 90
      cursorSystem, // priority: -100
      presenceSystem, // priority: -100
    ],

    keybinds: [
      {
        command: RemoveSelected.name,
        key: Key.Delete,
      },
      {
        command: SelectAll.name,
        key: Key.A,
        mod: true,
      },
      {
        command: BringForwardSelected.name,
        key: Key.BracketRight,
      },
      {
        command: SendBackwardSelected.name,
        key: Key.BracketLeft,
      },
    ],

    cursors: CURSORS,

    setup(ctx) {
      const { domElement } = getResources<EditorResources>(ctx)
      if (!domElement) return // Headless/SSR mode — no DOM to attach to

      // Attach all event listeners
      attachKeyboardListeners(domElement)
      attachMouseListeners(domElement)
      attachScreenObserver(domElement)
      attachPointerListeners(domElement)
    },

    teardown(ctx) {
      const { domElement } = getResources<EditorResources>(ctx)
      if (!domElement) return

      // Detach all event listeners
      detachKeyboardListeners(domElement)
      detachMouseListeners(domElement)
      detachScreenObserver(domElement)
      detachPointerListeners(domElement)
    },
  }
}
