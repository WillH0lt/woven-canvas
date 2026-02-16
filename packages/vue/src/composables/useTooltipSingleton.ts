import { inject, type Ref, readonly, ref } from 'vue'
import { TOOLTIP_KEY, type TooltipContext, type TooltipState } from '../injection'

export type { TooltipState }

// Timing configuration
const HOVER_DELAY = 500 // ms before tooltip shows on first hover
const WARMUP_DURATION = 1500 // ms the tooltip stays "warm" after leaving

/**
 * Creates a new tooltip context with its own isolated state.
 * Used by InfiniteCanvas to provide per-instance tooltip state.
 */
export function createTooltipContext(): TooltipContext {
  const activeTooltip = ref<TooltipState | null>(null)
  const isVisible = ref(false)
  const isWarmedUp = ref(false)

  let hoverTimer: ReturnType<typeof setTimeout> | null = null
  let warmupTimer: ReturnType<typeof setTimeout> | null = null

  function clearTimers() {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      hoverTimer = null
    }
    if (warmupTimer) {
      clearTimeout(warmupTimer)
      warmupTimer = null
    }
  }

  /**
   * Shows a tooltip for the given element after the hover delay.
   * If already warmed up, shows immediately.
   */
  function show(text: string, anchor: HTMLElement) {
    clearTimers()

    activeTooltip.value = { text, anchor }

    if (isWarmedUp.value) {
      // Already warmed up, show immediately
      isVisible.value = true
    } else {
      // Start hover timer
      hoverTimer = setTimeout(() => {
        isVisible.value = true
        isWarmedUp.value = true
        hoverTimer = null
      }, HOVER_DELAY)
    }
  }

  /**
   * Hides the tooltip and starts the warmup cooldown timer.
   */
  function hide() {
    clearTimers()
    isVisible.value = false
    activeTooltip.value = null

    // Start warmup cooldown timer
    if (isWarmedUp.value) {
      warmupTimer = setTimeout(() => {
        isWarmedUp.value = false
        warmupTimer = null
      }, WARMUP_DURATION)
    }
  }

  /**
   * Immediately resets all tooltip state (useful when menu bar loses focus entirely).
   */
  function reset() {
    clearTimers()
    isVisible.value = false
    activeTooltip.value = null
    isWarmedUp.value = false
  }

  return {
    activeTooltip: readonly(activeTooltip) as Readonly<Ref<TooltipState | null>>,
    isVisible: readonly(isVisible),
    isWarmedUp: readonly(isWarmedUp),
    show,
    hide,
    reset,
  }
}

/**
 * Composable to access the tooltip singleton for the current InfiniteCanvas instance.
 * Must be called within a component that is a descendant of InfiniteCanvas.
 */
export function useTooltipSingleton(): TooltipContext {
  const context = inject(TOOLTIP_KEY)
  if (!context) {
    throw new Error('useTooltipSingleton must be used within an InfiniteCanvas component')
  }
  return context
}
