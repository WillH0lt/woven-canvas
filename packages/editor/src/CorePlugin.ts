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
import { undoRedoSystem } from "./systems/update";
import { scaleWithZoomSystem } from "./systems/preRender";
import { cursorSystem } from "./systems/postRender";

import { Synced, User } from "./components";
import * as components from "./components";
import * as singletons from "./singletons";
import { Key } from "./singletons/Keyboard";
import { Undo, Redo } from "./command";

import { PLUGIN_NAME } from "./constants";
import { cursors } from "./cursors";

/**
 * Core plugin - handles core input and camera functionality.
 */
export const CorePlugin: EditorPlugin = {
  name: PLUGIN_NAME,

  cursors,

  singletons: Object.values(singletons).filter(
    (v): v is EditorSingletonDef<any> => v instanceof EditorSingletonDef
  ),

  components: Object.values(components).filter(
    (v) => v instanceof EditorComponentDef
  ) as AnyEditorComponentDef[],

  keybinds: [
    { command: Undo.name, key: Key.Z, mod: true },
    { command: Redo.name, key: Key.Y, mod: true },
    { command: Redo.name, key: Key.Z, mod: true, shift: true },
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

    // Update phase
    undoRedoSystem,

    // Render phase
    scaleWithZoomSystem, // priority: 100
    cursorSystem, // priority: -100
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
