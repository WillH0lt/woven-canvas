import type { EditorPlugin } from "@infinitecanvas/editor";
import { getResources } from "@infinitecanvas/ecs";
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
import type { InputResources } from "./types";

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
 * import { InputPlugin, type InputResources } from '@infinitecanvas/plugin-input';
 *
 * const editor = new Editor({
 *   plugins: [InputPlugin],
 *   resources: {
 *     domElement: document.getElementById('canvas')!,
 *   } satisfies InputResources,
 * });
 *
 * await editor.initialize();
 * ```
 */
export const InputPlugin: EditorPlugin = {
  name: "input",

  singletons: [Keyboard, Mouse, Screen],

  components: [Pointer],

  systems: [
    keyboardInputSystem,
    mouseInputSystem,
    screenInputSystem,
    pointerInputSystem,
  ],

  setup(editor) {
    const ctx = editor.getContext();
    if (!ctx) {
      throw new Error(
        "InputPlugin: Editor context not available. Call editor.initialize() first."
      );
    }

    const resources = getResources<InputResources>(ctx);

    if (!resources.domElement) {
      throw new Error(
        "InputPlugin: domElement is required in resources. " +
          "Pass { domElement: yourElement } when creating the Editor."
      );
    }

    // Attach all event listeners
    attachKeyboardListeners(resources);
    attachMouseListeners(resources);
    attachScreenObserver(resources);
    attachPointerListeners(resources);
  },

  teardown(editor) {
    const ctx = editor.getContext();
    if (!ctx) return;

    const resources = getResources<InputResources>(ctx);
    if (!resources.domElement) return;

    // Detach all event listeners
    detachKeyboardListeners(resources);
    detachMouseListeners(resources);
    detachScreenObserver(resources);
    detachPointerListeners(resources);
  },
};
