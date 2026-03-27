import {
  type AnyCanvasComponentDef,
  type AnyCanvasSingletonDef,
  CanvasComponentDef,
  CanvasSingletonDef,
} from '@woven-ecs/canvas-store'
import { getResources } from '@woven-ecs/core'
import * as components from './components'
import { Asset, Color, Embed, Image, Shape, Text, VerticalAlign } from './components'
import { CORE_PLUGIN_NAME } from './constants'
import type { EditorPlugin } from './plugin'
import * as singletons from './singletons'
import { captureShapeDrawSystem, keybindSystem } from './systems/capture'
import {
  attachKeyboardListeners,
  attachMouseListeners,
  attachPointerListeners,
  attachScreenObserver,
  detachKeyboardListeners,
  detachMouseListeners,
  detachPointerListeners,
  detachScreenObserver,
  frameSystem,
  keyboardSystem,
  mouseSystem,
  pointerSystem,
  screenSystem,
} from './systems/input'
import { cursorSystem, presenceSystem } from './systems/postRender'
import { intersectSystem } from './systems/preCapture'
import { rankBoundsSystem } from './systems/preInput'
import { canSeeBlocksSystem, scaleWithZoomSystem } from './systems/preRender'
import { updateShapeDrawSystem } from './systems/update'
import { type EditorResources, ResizeMode } from './types'

/**
 * Core plugin - handles input, camera, and basic block types.
 */
export const CorePlugin: EditorPlugin = {
  name: CORE_PLUGIN_NAME,

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
  ],

  systems: [
    // Input phase
    frameSystem, // priority: 100
    rankBoundsSystem, // priority: 100
    keyboardSystem,
    mouseSystem,
    screenSystem,
    pointerSystem,

    // Capture phase
    intersectSystem, // priority: 100
    keybindSystem,
    captureShapeDrawSystem, // priority: 100

    // Update phase
    updateShapeDrawSystem,

    // Render phase
    scaleWithZoomSystem, // priority: 100
    canSeeBlocksSystem, // priority: 90
    cursorSystem, // priority: -100
    presenceSystem, // priority: -100
  ],

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
