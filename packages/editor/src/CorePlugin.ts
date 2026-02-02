import { getResources } from "@infinitecanvas/ecs";

import type { EditorPlugin } from "./plugin";
import type { EditorResources } from "./types";
import {
  EditorComponentDef,
  type AnyEditorComponentDef,
  EditorSingletonDef,
  type AnyEditorSingletonDef,
} from "@infinitecanvas/ecs-sync";
import {
  attachKeyboardListeners,
  detachKeyboardListeners,
  attachMouseListeners,
  detachMouseListeners,
  attachScreenObserver,
  detachScreenObserver,
  attachPointerListeners,
  detachPointerListeners,
  frameSystem,
  keyboardSystem,
  mouseSystem,
  screenSystem,
  pointerSystem,
} from "./systems/input";
import { rankBoundsSystem } from "./systems/preInput";
import { intersectSystem } from "./systems/preCapture";
import { keybindSystem } from "./systems/capture";
import { removeEmptyTextSystem } from "./systems/update";
import { scaleWithZoomSystem } from "./systems/preRender";
import { cursorSystem } from "./systems/postRender";
import * as components from "./components";
import * as singletons from "./singletons";

import { PLUGIN_NAME } from "./constants";
import { cursors } from "./cursors";

/**
 * Core plugin - handles core input and camera functionality.
 */
export const CorePlugin: EditorPlugin = {
  name: PLUGIN_NAME,

  cursors,

  singletons: Object.values(singletons).filter(
    (v) => v instanceof EditorSingletonDef,
  ) as AnyEditorSingletonDef[],

  components: Object.values(components).filter(
    (v) => v instanceof EditorComponentDef,
  ) as AnyEditorComponentDef[],

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

    // Update phase
    removeEmptyTextSystem,

    // Render phase
    scaleWithZoomSystem, // priority: 100
    cursorSystem, // priority: -100
  ],

  setup(ctx) {
    const { domElement } = getResources<EditorResources>(ctx);

    // Attach all event listeners
    attachKeyboardListeners(domElement);
    attachMouseListeners(domElement);
    attachScreenObserver(domElement);
    attachPointerListeners(domElement);
  },

  teardown(ctx) {
    const { domElement } = getResources<EditorResources>(ctx);

    // Detach all event listeners
    detachKeyboardListeners(domElement);
    detachMouseListeners(domElement);
    detachScreenObserver(domElement);
    detachPointerListeners(domElement);
  },
};
