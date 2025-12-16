import { getResources } from "@infinitecanvas/ecs";
import type { EditorPlugin } from "./plugin";
import type { EditorResources } from "./types";

import { Camera, Controls, Keyboard, Mouse, Screen, Pointer } from "./components";
import {
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
  updateCameraSystem,
} from "./systems";

/**
 * Core plugin - handles core input and camera functionality.
 */
export const CorePlugin: EditorPlugin = {
  name: "core",

  singletons: [Camera, Controls, Keyboard, Mouse, Screen],

  components: [Pointer],

  inputSystems: [
    keyboardInputSystem,
    mouseInputSystem,
    screenInputSystem,
    pointerInputSystem,
  ],

  updateSystems: [updateCameraSystem],

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
