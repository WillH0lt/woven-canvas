import {
  type EditorPlugin,
  getResources,
  type EditorResources,
} from "@infinitecanvas/editor";

import { Keyboard, Mouse, Screen, Pointer } from "./components";
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
} from "./systems";

/**
 * Input plugin - handles keyboard, mouse, screen, and pointer input.
 *
 * Provides:
 * - **Keyboard** singleton - binary-based key state tracking
 * - **Mouse** singleton - mouse position, wheel, enter/leave triggers
 * - **Screen** singleton - editor element dimensions
 * - **Pointer** component - entities for each active pointer (touch/pen/mouse)
 *
 * Systems run in the `input` phase and convert DOM events to ECS state.
 *
 * @example
 * ```typescript
 * import { Editor } from '@infinitecanvas/editor';
 * import { InputPlugin } from '@infinitecanvas/plugin-input';
 *
 * const editor = new Editor(document.getElementById('canvas')!, {
 *   plugins: [InputPlugin],
 * });
 *
 * await editor.initialize();
 * ```
 */
export const InputPlugin: EditorPlugin = {
  name: "input",

  singletons: [Keyboard, Mouse, Screen],

  components: [Pointer],

  inputSystems: [
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
