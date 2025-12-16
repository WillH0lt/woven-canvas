import { field, type Context } from "@infinitecanvas/ecs";
import { EditorSingletonDef } from "../EditorSingletonDef";

/** Binary size for key states (32 bytes = 256 bits = covers all keycodes) */
const KEY_BINARY_SIZE = 32;

/** Default empty binary buffer for key states */
const EMPTY_KEY_BUFFER = new Uint8Array(KEY_BINARY_SIZE);

const KeyboardSchema = {
  /** Binary field where each bit represents whether a key is currently pressed. */
  keysDown: field.binary().max(KEY_BINARY_SIZE).default(EMPTY_KEY_BUFFER),
  /** Binary field for key-down triggers (true for exactly 1 frame when key is pressed). */
  keysDownTrigger: field
    .binary()
    .max(KEY_BINARY_SIZE)
    .default(EMPTY_KEY_BUFFER),
  /** Binary field for key-up triggers (true for exactly 1 frame when key is released). */
  keysUpTrigger: field.binary().max(KEY_BINARY_SIZE).default(EMPTY_KEY_BUFFER),
  /** Common modifier - Shift key is down */
  shiftDown: field.boolean().default(false),
  /** Common modifier - Alt/Option key is down */
  altDown: field.boolean().default(false),
  /** Common modifier - Ctrl (Windows/Linux) or Cmd (Mac) is down */
  modDown: field.boolean().default(false),
};

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

/**
 * Keyboard singleton - tracks keyboard state using binary fields for efficiency.
 *
 * Instead of having a separate boolean field for each key, we use binary fields
 * where each bit represents a key state. This is more memory-efficient and
 * allows tracking all possible keys.
 */
class KeyboardDef extends EditorSingletonDef<typeof KeyboardSchema> {
  constructor() {
    super(KeyboardSchema, { sync: "none" });
  }

  /**
   * Check if a key is currently pressed.
   * @param ctx - Editor context
   * @param keyCode - The keyCode to check (e.g., 65 for 'A')
   */
  isKeyDown(ctx: Context, keyCode: number): boolean {
    return getBit(this.read(ctx).keysDown, keyCode);
  }

  /**
   * Check if a key was just pressed this frame.
   * @param ctx - Editor context
   * @param keyCode - The keyCode to check
   */
  isKeyDownTrigger(ctx: Context, keyCode: number): boolean {
    return getBit(this.read(ctx).keysDownTrigger, keyCode);
  }

  /**
   * Check if a key was just released this frame.
   * @param ctx - Editor context
   * @param keyCode - The keyCode to check
   */
  isKeyUpTrigger(ctx: Context, keyCode: number): boolean {
    return getBit(this.read(ctx).keysUpTrigger, keyCode);
  }
}

export const Keyboard = new KeyboardDef();

/**
 * Set a bit in a binary field.
 * @internal
 */
export function setBit(
  buffer: Uint8Array,
  bitIndex: number,
  value: boolean
): void {
  if (bitIndex < 0 || bitIndex >= buffer.length * 8) return;
  const byteIndex = Math.floor(bitIndex / 8);
  const bitOffset = bitIndex % 8;
  if (value) {
    buffer[byteIndex] |= 1 << bitOffset;
  } else {
    buffer[byteIndex] &= ~(1 << bitOffset);
  }
}

/**
 * Clear all bits in a binary field.
 * @internal
 */
export function clearBits(buffer: Uint8Array): void {
  buffer.fill(0);
}

/**
 * Common key codes for convenience
 */
export const KeyCode = {
  // Letters
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,

  // Numbers
  Digit0: 48,
  Digit1: 49,
  Digit2: 50,
  Digit3: 51,
  Digit4: 52,
  Digit5: 53,
  Digit6: 54,
  Digit7: 55,
  Digit8: 56,
  Digit9: 57,

  // Function keys
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,

  // Modifiers
  Shift: 16,
  Control: 17,
  Alt: 18,
  Meta: 91, // Cmd on Mac, Windows key on Windows

  // Navigation
  Escape: 27,
  Space: 32,
  Enter: 13,
  Tab: 9,
  Backspace: 8,
  Delete: 46,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Home: 36,
  End: 35,
  PageUp: 33,
  PageDown: 34,

  // Punctuation
  Semicolon: 186,
  Equal: 187,
  Comma: 188,
  Minus: 189,
  Period: 190,
  Slash: 191,
  Backquote: 192,
  BracketLeft: 219,
  Backslash: 220,
  BracketRight: 221,
  Quote: 222,
};

export type KeyCode = (typeof KeyCode)[keyof typeof KeyCode];
