// Types
export type {
  PointerInput,
  PointerInputType,
  PointerInputOptions,
  MouseInput,
  MouseInputType,
} from "./types";

// Pointer input
export {
  getPointerInput,
  getPointerPosition,
  getPointerWorldPosition,
  hasActivePointer,
  clearPointerTrackingState,
  setCameraProvider,
  resetCameraProvider,
  type CameraProvider,
} from "./pointerEvents";

// Mouse input
export {
  getMouseInput,
  didMouseWheel,
  didMouseMove,
  getMousePosition,
  getMouseWorldPosition,
  getMouseWheelDelta,
  setMouseCameraProvider,
  resetMouseCameraProvider,
} from "./mouseEvents";

// Keyboard input
export {
  isKeyDown,
  isKeyDownTrigger,
  isKeyUpTrigger,
  isShiftDown,
  isAltDown,
  isModDown,
  getModifiers,
  KeyCode,
} from "./keyboardEvents";
