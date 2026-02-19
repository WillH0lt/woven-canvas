import { getResources } from '@woven-ecs/core'
import { defineEditorSystem } from '../../EditorSystem'
import { Frame, Screen } from '../../singletons'
import type { EditorResources } from '../../types'

/**
 * Per-instance state for screen input
 */
interface ScreenState {
  needsUpdate: boolean
  resizeObserver: ResizeObserver
  onScroll: () => void
}

/**
 * Per-instance state keyed by DOM element
 */
const instanceState = new WeakMap<HTMLElement, ScreenState>()

/**
 * Attach screen resize observer.
 * Called from plugin setup.
 */
export function attachScreenObserver(domElement: HTMLElement): void {
  if (instanceState.has(domElement)) return

  const state: ScreenState = {
    needsUpdate: false,
    resizeObserver: new ResizeObserver(() => {
      state.needsUpdate = true
    }),
    onScroll: () => {
      state.needsUpdate = true
    },
  }

  instanceState.set(domElement, state)
  state.resizeObserver.observe(domElement)
  window.addEventListener('scroll', state.onScroll, true)
}

/**
 * Detach screen resize observer.
 * Called from plugin teardown.
 */
export function detachScreenObserver(domElement: HTMLElement): void {
  const state = instanceState.get(domElement)

  if (!state) return

  state.resizeObserver.disconnect()
  window.removeEventListener('scroll', state.onScroll, true)
  instanceState.delete(domElement)
}

/**
 * Screen system - tracks editor element dimensions.
 *
 * Uses ResizeObserver to detect size changes and updates the Screen singleton.
 * Also handles initial sizing on the first frame.
 */
export const screenSystem = defineEditorSystem({ phase: 'input' }, (ctx) => {
  const resources = getResources<EditorResources>(ctx)
  const { domElement } = resources
  const state = instanceState.get(domElement)
  if (!state) return

  const frame = Frame.read(ctx)

  // Handle initial sizing on first frame
  if (frame.number === 1) {
    state.needsUpdate = true
  }

  if (!state.needsUpdate) return

  const screen = Screen.write(ctx)
  const rect = domElement.getBoundingClientRect()

  screen.left = rect.left
  screen.top = rect.top
  screen.width = rect.width
  screen.height = rect.height

  state.needsUpdate = false
})
