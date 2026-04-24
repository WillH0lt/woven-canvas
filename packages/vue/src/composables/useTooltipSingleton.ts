import { type Ref, readonly, ref } from 'vue'

// Timing configuration
const HOVER_DELAY = 500 // ms before tooltip shows on first hover
const WARMUP_DURATION = 1500 // ms the tooltip stays "warm" after leaving

export interface TooltipState {
  /** The text to display */
  text: string
  /** The element to anchor the tooltip to */
  anchor: HTMLElement
}

export interface TooltipContext {
  activeTooltip: Readonly<Ref<TooltipState | null>>
  isVisible: Readonly<Ref<boolean>>
  isWarmedUp: Readonly<Ref<boolean>>
  show: (text: string, anchor: HTMLElement) => void
  hide: () => void
  reset: () => void
}

// Module-level singleton state — one tooltip per app, shared across all
// WovenCanvas instances and any buttons mounted outside a canvas.
const activeTooltip = ref<TooltipState | null>(null)
const isVisible = ref(false)
const isWarmedUp = ref(false)

let hoverTimer: ReturnType<typeof setTimeout> | null = null
let warmupTimer: ReturnType<typeof setTimeout> | null = null
let anchorObserver: MutationObserver | null = null

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

function stopAnchorObserver() {
  if (anchorObserver) {
    anchorObserver.disconnect()
    anchorObserver = null
  }
}

// Watch for the anchor being removed from the document so the tooltip
// never lingers pointing at a detached element (e.g. when the button
// that triggered it unmounts while hovered).
function watchAnchor(anchor: HTMLElement) {
  stopAnchorObserver()
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
  anchorObserver = new MutationObserver(() => {
    if (!anchor.isConnected) reset()
  })
  anchorObserver.observe(document.body, { childList: true, subtree: true })
}

function show(text: string, anchor: HTMLElement) {
  clearTimers()

  activeTooltip.value = { text, anchor }
  watchAnchor(anchor)

  if (isWarmedUp.value) {
    isVisible.value = true
  } else {
    hoverTimer = setTimeout(() => {
      isVisible.value = true
      isWarmedUp.value = true
      hoverTimer = null
    }, HOVER_DELAY)
  }
}

function hide() {
  clearTimers()
  stopAnchorObserver()
  isVisible.value = false
  activeTooltip.value = null

  if (isWarmedUp.value) {
    warmupTimer = setTimeout(() => {
      isWarmedUp.value = false
      warmupTimer = null
    }, WARMUP_DURATION)
  }
}

function reset() {
  clearTimers()
  stopAnchorObserver()
  isVisible.value = false
  activeTooltip.value = null
  isWarmedUp.value = false
}

const sharedContext: TooltipContext = {
  activeTooltip: readonly(activeTooltip) as Readonly<Ref<TooltipState | null>>,
  isVisible: readonly(isVisible),
  isWarmedUp: readonly(isWarmedUp),
  show,
  hide,
  reset,
}

// Tracks mounted MenuTooltip instances. WovenCanvas mounts one internally,
// so pages with N canvases would render N identical tooltip divs. Only the
// first-mounted instance actually renders; the rest are no-ops.
export const mountedTooltipInstances = ref<symbol[]>([])

/**
 * Access the app-wide tooltip singleton. Safe to call from any component,
 * inside or outside a WovenCanvas.
 *
 * WovenCanvas mounts a `<MenuTooltip />` internally, so tooltips "just work"
 * for any button on the page. If you're using this library's buttons without
 * a WovenCanvas, mount `<MenuTooltip />` yourself somewhere in your app.
 */
export function useTooltipSingleton(): TooltipContext {
  return sharedContext
}
