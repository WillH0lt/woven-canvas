import { getResources } from "@infinitecanvas/ecs";
import type { EditorPlugin } from "./plugin";
import type { EditorResources } from "./types";

import {
  Camera,
  Controls,
  Frame,
  Keyboard,
  Mouse,
  Screen,
  Pointer,
  Storable,
} from "./components";
import {
  frameInputSystem,
  keyboardInputSystem,
  attachKeyboardListeners,
  detachKeyboardListeners,
  mouseInputSystem,
  attachMouseListeners,
  detachMouseListeners,
  screenInputSystem,
  attachScreenObserver,
  detachScreenObserver,
  pointerInputSystem,
  attachPointerListeners,
  detachPointerListeners,
} from "./systems";

/**
 * Core plugin - handles core input and camera functionality.
 */
export const CorePlugin: EditorPlugin = {
  name: "core",

  singletons: [Camera, Controls, Frame, Keyboard, Mouse, Screen],

  components: [Pointer, Storable],

  inputSystems: [
    frameInputSystem,
    keyboardInputSystem,
    mouseInputSystem,
    screenInputSystem,
    pointerInputSystem,
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
