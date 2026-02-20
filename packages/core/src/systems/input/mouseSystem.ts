import { type Context, getResources } from '@woven-ecs/core'
import { defineEditorSystem } from '../../EditorSystem'
import { Mouse } from '../../singletons/Mouse'
import { Screen } from '../../singletons/Screen'
import type { EditorResources } from '../../types'

/**
 * Event types we track
 */
type MouseEventType = 'mousemove' | 'wheel' | 'mouseenter' | 'mouseleave'

interface BufferedMouseEvent {
  type: MouseEventType
  clientX?: number
  clientY?: number
  deltaX?: number
  deltaY?: number
  deltaMode?: number
}

/**
 * Per-instance state for mouse input
 */
interface MouseState {
  eventsBuffer: BufferedMouseEvent[]
  onMouseMove: (e: MouseEvent) => void
  onWheel: (e: WheelEvent) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

/**
 * Per-instance state keyed by DOM element
 */
const instanceState = new WeakMap<HTMLElement, MouseState>()

/**
 * Attach mouse event listeners.
 * Called from plugin setup.
 */
export function attachMouseListeners(domElement: HTMLElement): void {
  if (instanceState.has(domElement)) return

  const state: MouseState = {
    eventsBuffer: [],
    onMouseMove: (e: MouseEvent) => {
      state.eventsBuffer.push({
        type: 'mousemove',
        clientX: e.clientX,
        clientY: e.clientY,
      })
    },
    onWheel: (e: WheelEvent) => {
      e.preventDefault()
      state.eventsBuffer.push({
        type: 'wheel',
        clientX: e.clientX,
        clientY: e.clientY,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
      })
    },
    onMouseEnter: () => {
      state.eventsBuffer.push({ type: 'mouseenter' })
    },
    onMouseLeave: () => {
      state.eventsBuffer.push({ type: 'mouseleave' })
    },
  }

  instanceState.set(domElement, state)

  // Attach listeners - mousemove on window to track even outside element
  window.addEventListener('mousemove', state.onMouseMove)
  domElement.addEventListener('wheel', state.onWheel, { passive: false })
  domElement.addEventListener('mouseenter', state.onMouseEnter)
  domElement.addEventListener('mouseleave', state.onMouseLeave)
}

/**
 * Detach mouse event listeners.
 * Called from plugin teardown.
 */
export function detachMouseListeners(domElement: HTMLElement): void {
  const state = instanceState.get(domElement)

  if (!state) return

  window.removeEventListener('mousemove', state.onMouseMove)
  domElement.removeEventListener('wheel', state.onWheel)
  domElement.removeEventListener('mouseenter', state.onMouseEnter)
  domElement.removeEventListener('mouseleave', state.onMouseLeave)

  instanceState.delete(domElement)
}

/**
 * Mouse system - converts mouse events to ECS state.
 *
 * Updates the Mouse singleton with:
 * - Current position (relative to editor element)
 * - Wheel deltas (normalized across browsers)
 * - Triggers for move, wheel, enter, leave events
 */
export const mouseSystem = defineEditorSystem({ phase: 'input' }, (ctx: Context) => {
  const resources = getResources<EditorResources>(ctx)
  const state = instanceState.get(resources.domElement)
  if (!state) return

  const currentMouse = Mouse.read(ctx)
  const hadTriggers =
    currentMouse.moveTrigger || currentMouse.wheelTrigger || currentMouse.enterTrigger || currentMouse.leaveTrigger
  const hasEvents = state.eventsBuffer.length > 0

  // Only write if we need to clear previous triggers or process new events
  if (!hadTriggers && !hasEvents) return

  const mouse = Mouse.write(ctx)
  const screen = Screen.read(ctx)

  // Clear triggers from previous frame
  mouse.moveTrigger = false
  mouse.wheelTrigger = false
  mouse.enterTrigger = false
  mouse.leaveTrigger = false
  mouse.wheelDeltaX = 0
  mouse.wheelDeltaY = 0

  // Process buffered events
  for (const event of state.eventsBuffer) {
    switch (event.type) {
      case 'mousemove':
        // Convert to element-relative coordinates
        mouse.position = [event.clientX! - screen.left, event.clientY! - screen.top]
        mouse.moveTrigger = true
        break

      case 'wheel':
        mouse.wheelDeltaX = event.deltaX!
        mouse.wheelDeltaY = normalizeWheelDelta(event.deltaY!, event.deltaMode!)
        mouse.wheelTrigger = true

        break

      case 'mouseenter':
        mouse.enterTrigger = true
        break

      case 'mouseleave':
        mouse.leaveTrigger = true
        break
    }
  }

  // Clear buffer
  state.eventsBuffer.length = 0
})

/**
 * Normalize wheel deltaY across browsers and delta modes.
 * @param deltaY - Raw deltaY from WheelEvent
 * @param deltaMode - WheelEvent.deltaMode (0=pixel, 1=line, 2=page)
 * @returns Normalized delta in pixels
 */
function normalizeWheelDelta(deltaY: number, deltaMode: number): number {
  const LINE_HEIGHT = 16
  const PAGE_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 800

  let normalized = deltaY

  // Convert based on deltaMode
  if (deltaMode === 1) {
    // Line mode
    normalized *= LINE_HEIGHT
  } else if (deltaMode === 2) {
    // Page mode
    normalized *= PAGE_HEIGHT
  }

  // Firefox adjustment
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox')) {
    normalized *= 4
  }

  // macOS adjustment
  if (
    typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('Mac') || navigator.userAgent.includes('Macintosh'))
  ) {
    normalized *= 1.5
  }

  // Clamp to reasonable range
  return Math.min(Math.max(normalized, -100), 100)
}
