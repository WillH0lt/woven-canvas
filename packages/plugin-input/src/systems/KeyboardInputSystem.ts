import {
  defineEditorSystem,
  type Context,
  type EditorResources,
  getResources,
} from "@infinitecanvas/editor";
import { Keyboard, setBit } from "../components/Keyboard";

/**
 * Per-instance state for keyboard input
 */
interface KeyboardState {
  eventsBuffer: KeyboardEvent[];
  onKeyDown: (e: KeyboardEvent) => void;
  onKeyUp: (e: KeyboardEvent) => void;
  onBlur: () => void;
}

/**
 * Per-instance state keyed by DOM element
 */
const instanceState = new WeakMap<HTMLElement, KeyboardState>();

/**
 * Attach keyboard event listeners.
 * Called from plugin setup.
 */
export function attachKeyboardListeners(domElement: HTMLElement): void {
  if (instanceState.has(domElement)) return;

  // Make element focusable if not already
  if (!domElement.hasAttribute("tabindex")) {
    domElement.setAttribute("tabindex", "0");
  }

  const state: KeyboardState = {
    eventsBuffer: [],
    onKeyDown: (e: KeyboardEvent) => {
      // Prevent default for certain keys
      if (e.key === "Tab" || e.key === "Alt") {
        e.preventDefault();
      }
      state.eventsBuffer.push(e);
    },
    onKeyUp: (e: KeyboardEvent) => {
      state.eventsBuffer.push(e);
    },
    onBlur: () => {
      // Create a synthetic event to signal blur
      state.eventsBuffer.push({ type: "blur" } as unknown as KeyboardEvent);
    },
  };

  instanceState.set(domElement, state);

  domElement.addEventListener("keydown", state.onKeyDown);
  domElement.addEventListener("keyup", state.onKeyUp);
  domElement.addEventListener("blur", state.onBlur);
}

/**
 * Detach keyboard event listeners.
 * Called from plugin teardown.
 */
export function detachKeyboardListeners(domElement: HTMLElement): void {
  const state = instanceState.get(domElement);

  if (!state) return;

  domElement.removeEventListener("keydown", state.onKeyDown);
  domElement.removeEventListener("keyup", state.onKeyUp);
  domElement.removeEventListener("blur", state.onBlur);

  instanceState.delete(domElement);
}

/**
 * Keyboard input system - converts keyboard events to ECS state.
 *
 * Processes buffered keyboard events and updates the Keyboard singleton:
 * - Sets bits in keysDown for pressed keys
 * - Sets bits in keysDownTrigger for newly pressed keys (1 frame)
 * - Sets bits in keysUpTrigger for released keys (1 frame)
 * - Updates modifier booleans (shiftDown, altDown, modDown)
 */
export const keyboardInputSystem = defineEditorSystem((ctx: Context) => {
  const resources = getResources<EditorResources>(ctx);
  const state = instanceState.get(resources.domElement);
  if (!state) return;

  const keyboard = Keyboard.write(ctx);

  // Get mutable copies of the binary buffers
  // (ECS returns copies, so we need to modify and reassign)
  const keysDown = new Uint8Array(keyboard.keysDown);
  const keysDownTrigger = new Uint8Array(32); // Fresh buffer, cleared each frame
  const keysUpTrigger = new Uint8Array(32); // Fresh buffer, cleared each frame

  // Process buffered events
  for (const event of state.eventsBuffer) {
    if (event.type === "blur") {
      // Reset all keys on blur
      keysDown.fill(0);
      keyboard.shiftDown = false;
      keyboard.altDown = false;
      keyboard.modDown = false;
      continue;
    }

    const keyCode = event.keyCode;

    if (event.type === "keydown") {
      // Check if this is a new press (wasn't down before)
      const wasDown = getBit(keysDown, keyCode);
      if (!wasDown) {
        setBit(keysDownTrigger, keyCode, true);
      }

      setBit(keysDown, keyCode, true);
    } else if (event.type === "keyup") {
      setBit(keysDown, keyCode, false);
      setBit(keysUpTrigger, keyCode, true);
    }

    // Update modifier state from the event
    keyboard.shiftDown = event.shiftKey;
    keyboard.altDown = event.altKey;
    keyboard.modDown = event.ctrlKey || event.metaKey;
  }

  // Write back the modified buffers
  keyboard.keysDown = keysDown;
  keyboard.keysDownTrigger = keysDownTrigger;
  keyboard.keysUpTrigger = keysUpTrigger;

  // Clear buffer
  state.eventsBuffer.length = 0;
});

/**
 * Get a bit from a binary field.
 * @internal
 */
function getBit(buffer: Uint8Array, bitIndex: number): boolean {
  if (bitIndex < 0 || bitIndex >= buffer.length * 8) return false;
  const byteIndex = Math.floor(bitIndex / 8);
  const bitOffset = bitIndex % 8;
  return (buffer[byteIndex] & (1 << bitOffset)) !== 0;
}
