import { CanvasSingletonDef } from '@woven-ecs/canvas-store'
import { type Context, field } from '@woven-ecs/core'

/** Buffer size for key states (32 bytes = 256 bits = covers all keycodes) */
const KEY_BUFFER_SIZE = 32

const KeyboardSchema = {
  /**
   * Buffer where each bit represents whether a key is currently pressed.
   * Uses field.buffer for zero-allocation subarray views.
   */
  keysDown: field.buffer(field.uint8()).size(KEY_BUFFER_SIZE),
  /**
   * Buffer for key-down triggers (true for exactly 1 frame when key is pressed).
   * Uses field.buffer for zero-allocation subarray views.
   */
  keysDownTrigger: field.buffer(field.uint8()).size(KEY_BUFFER_SIZE),
  /**
   * Buffer for key-up triggers (true for exactly 1 frame when key is released).
   * Uses field.buffer for zero-allocation subarray views.
   */
  keysUpTrigger: field.buffer(field.uint8()).size(KEY_BUFFER_SIZE),
  /** Common modifier - Shift key is down */
  shiftDown: field.boolean().default(false),
  /** Common modifier - Alt/Option key is down */
  altDown: field.boolean().default(false),
  /** Common modifier - Ctrl (Windows/Linux) or Cmd (Mac) is down */
  modDown: field.boolean().default(false),
}

/**
 * Get a bit from a buffer field.
 * @internal
 */
function getBit(buffer: ArrayLike<number>, bitIndex: number): boolean {
  if (bitIndex < 0 || bitIndex >= buffer.length * 8) return false
  const byteIndex = Math.floor(bitIndex / 8)
  const bitOffset = bitIndex % 8
  return (buffer[byteIndex] & (1 << bitOffset)) !== 0
}

/**
 * Keyboard singleton - tracks keyboard state using binary fields for efficiency.
 *
 * Instead of having a separate boolean field for each key, we use binary fields
 * where each bit represents a key state. This is more memory-efficient and
 * allows tracking all possible keys.
 */
class KeyboardDef extends CanvasSingletonDef<typeof KeyboardSchema> {
  constructor() {
    super({ name: 'keyboard' }, KeyboardSchema)
  }

  /**
   * Check if a key is currently pressed.
   * @param ctx - Editor context
   * @param key - The key index to check (use Key.A, Key.Space, etc.)
   */
  isKeyDown(ctx: Context, key: number): boolean {
    return getBit(this.read(ctx).keysDown, key)
  }

  /**
   * Check if a key was just pressed this frame.
   * @param ctx - Editor context
   * @param key - The key index to check (use Key.A, Key.Space, etc.)
   */
  isKeyDownTrigger(ctx: Context, key: number): boolean {
    return getBit(this.read(ctx).keysDownTrigger, key)
  }

  /**
   * Check if a key was just released this frame.
   * @param ctx - Editor context
   * @param key - The key index to check (use Key.A, Key.Space, etc.)
   */
  isKeyUpTrigger(ctx: Context, key: number): boolean {
    return getBit(this.read(ctx).keysUpTrigger, key)
  }
}

export const Keyboard = new KeyboardDef()

/**
 * Set a bit in a buffer field.
 * @internal
 */
export function setBit(buffer: { [index: number]: number; length: number }, bitIndex: number, value: boolean): void {
  if (bitIndex < 0 || bitIndex >= buffer.length * 8) return
  const byteIndex = Math.floor(bitIndex / 8)
  const bitOffset = bitIndex % 8
  if (value) {
    buffer[byteIndex] |= 1 << bitOffset
  } else {
    buffer[byteIndex] &= ~(1 << bitOffset)
  }
}

/**
 * Clear all bits in a buffer field.
 * @internal
 */
export function clearBits(buffer: { [index: number]: number; length: number }): void {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = 0
  }
}

/**
 * Mapping from event.code strings to bit indices.
 * Using event.code instead of event.keyCode for layout-independent key detection.
 * @internal
 */
export const codeToIndex: Record<string, number> = {
  // Letters (0-25)
  KeyA: 0,
  KeyB: 1,
  KeyC: 2,
  KeyD: 3,
  KeyE: 4,
  KeyF: 5,
  KeyG: 6,
  KeyH: 7,
  KeyI: 8,
  KeyJ: 9,
  KeyK: 10,
  KeyL: 11,
  KeyM: 12,
  KeyN: 13,
  KeyO: 14,
  KeyP: 15,
  KeyQ: 16,
  KeyR: 17,
  KeyS: 18,
  KeyT: 19,
  KeyU: 20,
  KeyV: 21,
  KeyW: 22,
  KeyX: 23,
  KeyY: 24,
  KeyZ: 25,

  // Numbers (26-35)
  Digit0: 26,
  Digit1: 27,
  Digit2: 28,
  Digit3: 29,
  Digit4: 30,
  Digit5: 31,
  Digit6: 32,
  Digit7: 33,
  Digit8: 34,
  Digit9: 35,

  // Function keys (36-47)
  F1: 36,
  F2: 37,
  F3: 38,
  F4: 39,
  F5: 40,
  F6: 41,
  F7: 42,
  F8: 43,
  F9: 44,
  F10: 45,
  F11: 46,
  F12: 47,

  // Modifiers (48-51)
  ShiftLeft: 48,
  ShiftRight: 49,
  ControlLeft: 50,
  ControlRight: 51,
  AltLeft: 52,
  AltRight: 53,
  MetaLeft: 54,
  MetaRight: 55,

  // Navigation (56-71)
  Escape: 56,
  Space: 57,
  Enter: 58,
  Tab: 59,
  Backspace: 60,
  Delete: 61,
  ArrowLeft: 62,
  ArrowUp: 63,
  ArrowRight: 64,
  ArrowDown: 65,
  Home: 66,
  End: 67,
  PageUp: 68,
  PageDown: 69,
  Insert: 70,

  // Punctuation (72-83)
  Semicolon: 72,
  Equal: 73,
  Comma: 74,
  Minus: 75,
  Period: 76,
  Slash: 77,
  Backquote: 78,
  BracketLeft: 79,
  Backslash: 80,
  BracketRight: 81,
  Quote: 82,

  // Numpad (84-99)
  Numpad0: 84,
  Numpad1: 85,
  Numpad2: 86,
  Numpad3: 87,
  Numpad4: 88,
  Numpad5: 89,
  Numpad6: 90,
  Numpad7: 91,
  Numpad8: 92,
  Numpad9: 93,
  NumpadAdd: 94,
  NumpadSubtract: 95,
  NumpadMultiply: 96,
  NumpadDivide: 97,
  NumpadDecimal: 98,
  NumpadEnter: 99,
}

/**
 * Key codes for use with Keyboard.isKeyDown(), isKeyDownTrigger(), isKeyUpTrigger().
 * These are numeric indices into the bit array, mapped from physical key positions (event.code).
 */
export const Key = {
  // Letters
  A: codeToIndex.KeyA,
  B: codeToIndex.KeyB,
  C: codeToIndex.KeyC,
  D: codeToIndex.KeyD,
  E: codeToIndex.KeyE,
  F: codeToIndex.KeyF,
  G: codeToIndex.KeyG,
  H: codeToIndex.KeyH,
  I: codeToIndex.KeyI,
  J: codeToIndex.KeyJ,
  K: codeToIndex.KeyK,
  L: codeToIndex.KeyL,
  M: codeToIndex.KeyM,
  N: codeToIndex.KeyN,
  O: codeToIndex.KeyO,
  P: codeToIndex.KeyP,
  Q: codeToIndex.KeyQ,
  R: codeToIndex.KeyR,
  S: codeToIndex.KeyS,
  T: codeToIndex.KeyT,
  U: codeToIndex.KeyU,
  V: codeToIndex.KeyV,
  W: codeToIndex.KeyW,
  X: codeToIndex.KeyX,
  Y: codeToIndex.KeyY,
  Z: codeToIndex.KeyZ,

  // Numbers
  Digit0: codeToIndex.Digit0,
  Digit1: codeToIndex.Digit1,
  Digit2: codeToIndex.Digit2,
  Digit3: codeToIndex.Digit3,
  Digit4: codeToIndex.Digit4,
  Digit5: codeToIndex.Digit5,
  Digit6: codeToIndex.Digit6,
  Digit7: codeToIndex.Digit7,
  Digit8: codeToIndex.Digit8,
  Digit9: codeToIndex.Digit9,

  // Function keys
  F1: codeToIndex.F1,
  F2: codeToIndex.F2,
  F3: codeToIndex.F3,
  F4: codeToIndex.F4,
  F5: codeToIndex.F5,
  F6: codeToIndex.F6,
  F7: codeToIndex.F7,
  F8: codeToIndex.F8,
  F9: codeToIndex.F9,
  F10: codeToIndex.F10,
  F11: codeToIndex.F11,
  F12: codeToIndex.F12,

  // Modifiers
  ShiftLeft: codeToIndex.ShiftLeft,
  ShiftRight: codeToIndex.ShiftRight,
  ControlLeft: codeToIndex.ControlLeft,
  ControlRight: codeToIndex.ControlRight,
  AltLeft: codeToIndex.AltLeft,
  AltRight: codeToIndex.AltRight,
  MetaLeft: codeToIndex.MetaLeft,
  MetaRight: codeToIndex.MetaRight,

  // Navigation
  Escape: codeToIndex.Escape,
  Space: codeToIndex.Space,
  Enter: codeToIndex.Enter,
  Tab: codeToIndex.Tab,
  Backspace: codeToIndex.Backspace,
  Delete: codeToIndex.Delete,
  ArrowLeft: codeToIndex.ArrowLeft,
  ArrowUp: codeToIndex.ArrowUp,
  ArrowRight: codeToIndex.ArrowRight,
  ArrowDown: codeToIndex.ArrowDown,
  Home: codeToIndex.Home,
  End: codeToIndex.End,
  PageUp: codeToIndex.PageUp,
  PageDown: codeToIndex.PageDown,
  Insert: codeToIndex.Insert,

  // Punctuation
  Semicolon: codeToIndex.Semicolon,
  Equal: codeToIndex.Equal,
  Comma: codeToIndex.Comma,
  Minus: codeToIndex.Minus,
  Period: codeToIndex.Period,
  Slash: codeToIndex.Slash,
  Backquote: codeToIndex.Backquote,
  BracketLeft: codeToIndex.BracketLeft,
  Backslash: codeToIndex.Backslash,
  BracketRight: codeToIndex.BracketRight,
  Quote: codeToIndex.Quote,

  // Numpad
  Numpad0: codeToIndex.Numpad0,
  Numpad1: codeToIndex.Numpad1,
  Numpad2: codeToIndex.Numpad2,
  Numpad3: codeToIndex.Numpad3,
  Numpad4: codeToIndex.Numpad4,
  Numpad5: codeToIndex.Numpad5,
  Numpad6: codeToIndex.Numpad6,
  Numpad7: codeToIndex.Numpad7,
  Numpad8: codeToIndex.Numpad8,
  Numpad9: codeToIndex.Numpad9,
  NumpadAdd: codeToIndex.NumpadAdd,
  NumpadSubtract: codeToIndex.NumpadSubtract,
  NumpadMultiply: codeToIndex.NumpadMultiply,
  NumpadDivide: codeToIndex.NumpadDivide,
  NumpadDecimal: codeToIndex.NumpadDecimal,
  NumpadEnter: codeToIndex.NumpadEnter,
} as const

export type Key = (typeof Key)[keyof typeof Key]
