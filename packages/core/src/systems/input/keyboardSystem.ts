import { type Context, getResources } from '@woven-ecs/core'
import { on, ResetKeyboard } from '../../command'
import { defineEditorSystem } from '../../EditorSystem'
import { clearBits, codeToIndex, Keyboard, setBit } from '../../singletons/Keyboard'
import type { EditorResources } from '../../types'

/**
 * Per-instance state for keyboard input
 */
interface KeyboardState {
  eventsBuffer: KeyboardEvent[]
  onKeyDown: (e: KeyboardEvent) => void
  onKeyUp: (e: KeyboardEvent) => void
  onBlur: () => void
}

/**
 * Per-instance state keyed by DOM element
 */
const instanceState = new WeakMap<HTMLElement, KeyboardState>()

/**
 * Attach keyboard event listeners.
 * Called from plugin setup.
 */
export function attachKeyboardListeners(domElement: HTMLElement): void {
  if (instanceState.has(domElement)) return

  // Make element focusable if not already
  if (!domElement.hasAttribute('tabindex')) {
    domElement.setAttribute('tabindex', '0')
  }

  const state: KeyboardState = {
    eventsBuffer: [],
    onKeyDown: (e: KeyboardEvent) => {
      // Prevent default for certain keys that interfere with canvas interaction
      if (e.key === 'Tab' || e.key === 'Alt' || e.key === ' ') {
        e.preventDefault()
      }
      state.eventsBuffer.push(e)
    },
    onKeyUp: (e: KeyboardEvent) => {
      state.eventsBuffer.push(e)
    },
    onBlur: () => {
      // Create a synthetic event to signal blur
      state.eventsBuffer.push({ type: 'blur' } as unknown as KeyboardEvent)
    },
  }

  instanceState.set(domElement, state)

  domElement.addEventListener('keydown', state.onKeyDown)
  domElement.addEventListener('keyup', state.onKeyUp)
  domElement.addEventListener('blur', state.onBlur)
}

/**
 * Detach keyboard event listeners.
 * Called from plugin teardown.
 */
export function detachKeyboardListeners(domElement: HTMLElement): void {
  const state = instanceState.get(domElement)

  if (!state) return

  domElement.removeEventListener('keydown', state.onKeyDown)
  domElement.removeEventListener('keyup', state.onKeyUp)
  domElement.removeEventListener('blur', state.onBlur)

  instanceState.delete(domElement)
}

/**
 * Keyboard system - converts keyboard events to ECS state.
 *
 * Processes buffered keyboard events and updates the Keyboard singleton:
 * - Sets bits in keysDown for pressed keys
 * - Sets bits in keysDownTrigger for newly pressed keys (1 frame)
 * - Sets bits in keysUpTrigger for released keys (1 frame)
 * - Updates modifier booleans (shiftDown, altDown, modDown)
 */
export const keyboardSystem = defineEditorSystem({ phase: 'input' }, (ctx: Context) => {
  const resources = getResources<EditorResources>(ctx)
  if (!resources.domElement) return
  const state = instanceState.get(resources.domElement)
  if (!state) return

  // Handle ResetKeyboard command - clears all keyboard state
  on(ctx, ResetKeyboard, () => {
    Keyboard.reset(ctx)
  })

  const hasEvents = state.eventsBuffer.length > 0

  // Check if triggers need to be cleared from previous frame
  const keyboardRead = Keyboard.read(ctx)
  const triggersNeedClearing = !isZeroed(keyboardRead.keysDownTrigger) || !isZeroed(keyboardRead.keysUpTrigger)

  // Only write if there are events or triggers need clearing
  if (!hasEvents && !triggersNeedClearing) return

  const keyboard = Keyboard.write(ctx)

  // Clear triggers from previous frame
  clearBits(keyboard.keysDownTrigger)
  clearBits(keyboard.keysUpTrigger)

  // Process buffered events
  for (const event of state.eventsBuffer) {
    if (event.type === 'blur') {
      // Reset all keys on blur
      clearBits(keyboard.keysDown)
      keyboard.shiftDown = false
      keyboard.altDown = false
      keyboard.modDown = false
      continue
    }

    const keyIndex = codeToIndex[event.code]
    if (keyIndex === undefined) continue // Unknown key, skip

    if (event.type === 'keydown') {
      // macOS doesn't deliver keyup for non-modifier keys while Cmd is held,
      // so a key can still be marked down after its keyup was swallowed. A
      // keydown without `repeat` is always a fresh physical press — trigger
      // it even if the key looks held.
      const wasDown = getBit(keyboard.keysDown, keyIndex)
      if (!wasDown || !event.repeat) {
        setBit(keyboard.keysDownTrigger, keyIndex, true)
      }
      setBit(keyboard.keysDown, keyIndex, true)
    } else if (event.type === 'keyup') {
      setBit(keyboard.keysDown, keyIndex, false)
      setBit(keyboard.keysUpTrigger, keyIndex, true)

      // Keyups swallowed while Cmd was held never arrive, even after Cmd is
      // released — release anything still marked down so keys don't stick.
      if (event.code === 'MetaLeft' || event.code === 'MetaRight') {
        releaseNonModifierKeys(keyboard)
      }
    }

    // Update modifier state from the event
    keyboard.shiftDown = event.shiftKey
    keyboard.altDown = event.altKey
    keyboard.modDown = event.ctrlKey || event.metaKey
  }

  // Clear buffer
  state.eventsBuffer.length = 0
})

/** Bit indices of modifier keys, which get real keyup events even on macOS. */
const MODIFIER_KEY_INDICES = new Set([
  codeToIndex.ShiftLeft,
  codeToIndex.ShiftRight,
  codeToIndex.ControlLeft,
  codeToIndex.ControlRight,
  codeToIndex.AltLeft,
  codeToIndex.AltRight,
  codeToIndex.MetaLeft,
  codeToIndex.MetaRight,
])

/**
 * Release all non-modifier keys still marked down, firing their up-triggers
 * as if the (swallowed) keyup events had arrived.
 * @internal
 */
function releaseNonModifierKeys(keyboard: { keysDown: Uint8Array; keysUpTrigger: Uint8Array }): void {
  const bitCount = keyboard.keysDown.length * 8
  for (let i = 0; i < bitCount; i++) {
    if (MODIFIER_KEY_INDICES.has(i)) continue
    if (!getBit(keyboard.keysDown, i)) continue
    setBit(keyboard.keysDown, i, false)
    setBit(keyboard.keysUpTrigger, i, true)
  }
}

/**
 * Get a bit from a binary field.
 * @internal
 */
function getBit(buffer: Uint8Array, bitIndex: number): boolean {
  if (bitIndex < 0 || bitIndex >= buffer.length * 8) return false
  const byteIndex = Math.floor(bitIndex / 8)
  const bitOffset = bitIndex % 8
  return (buffer[byteIndex] & (1 << bitOffset)) !== 0
}

/**
 * Check if a buffer is all zeros.
 * @internal
 */
function isZeroed(buffer: Uint8Array): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0) return false
  }
  return true
}
