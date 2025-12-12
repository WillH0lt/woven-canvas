// Plugin
export { InputPlugin } from "./plugin";

// Types
export type { InputResources } from "./types";

// Components
export {
  // Keyboard
  Keyboard,
  isKeyDown,
  isKeyDownTrigger,
  isKeyUpTrigger,
  KeyCode,
  // Mouse
  Mouse,
  // Screen
  Screen,
  // Pointer
  Pointer,
  PointerButton,
  PointerType,
  getPointerVelocity,
  addPointerSample,
  getPointerButton,
  getPointerType,
} from "./components";

// Systems (for advanced usage / testing)
export {
  keyboardInputSystem,
  mouseInputSystem,
  screenInputSystem,
  pointerInputSystem,
} from "./systems";
