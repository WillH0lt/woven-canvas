import { getResources, createEntity, addComponent } from "@infinitecanvas/ecs";

import type { EditorPlugin } from "./plugin";
import type { EditorResources } from "./types";
import {
  EditorComponentDef,
  type AnyEditorComponentDef,
} from "./EditorComponentDef";
import { EditorSingletonDef } from "./EditorSingletonDef";
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
import { scaleWithZoomSystem } from "./systems/preRender";
import { cursorSystem } from "./systems/postRender";

import { Synced, User } from "./components";
import * as components from "./components";
import * as singletons from "./singletons";

import { PLUGIN_NAME } from "./constants";

/**
 * Core plugin - handles core input and camera functionality.
 */
export const CorePlugin: EditorPlugin = {
  name: PLUGIN_NAME,

  singletons: Object.values(singletons).filter(
    (v): v is EditorSingletonDef<any> => v instanceof EditorSingletonDef
  ),

  components: Object.values(components).filter(
    (v) => v instanceof EditorComponentDef
  ) as AnyEditorComponentDef[],

  systems: [
    // Input phase (priority order: 100 = early, 0 = default, -100 = late)
    frameSystem, // priority: 100 - runs first
    rankBoundsSystem, // priority: 100 - runs early
    keyboardSystem, // priority: 0
    mouseSystem, // priority: 0
    screenSystem, // priority: 0
    pointerSystem, // priority: 0

    // Capture phase
    intersectSystem, // priority: 100 - runs early
    keybindSystem, // priority: 0

    // Render phase
    scaleWithZoomSystem, // priority: 100 - runs early
    cursorSystem, // priority: -100 - runs late
  ],

  setup(ctx) {
    const { domElement, sessionId, userId } =
      getResources<EditorResources>(ctx);

    // Attach all event listeners
    attachKeyboardListeners(domElement);
    attachMouseListeners(domElement);
    attachScreenObserver(domElement);
    attachPointerListeners(domElement);

    // Create the user entity for presence tracking
    const userEntity = createEntity(ctx);
    addComponent(ctx, userEntity, Synced, {
      id: sessionId,
    });
    addComponent(ctx, userEntity, User, {
      id: userId,
    });
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
