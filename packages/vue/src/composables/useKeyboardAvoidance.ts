import { Block, Camera, type Context, defineQuery, Edited, Text } from '@woven-canvas/core'
import { onUnmounted } from 'vue'
import { useTextEditorController } from './useTextEditorController'

const editedBlockQuery = defineQuery((q) => q.with(Block, Edited, Text))

/**
 * Pans the camera so that the edited block stays visible when the mobile
 * virtual keyboard opens (shrinking the visual viewport).
 *
 * Uses the `visualViewport` API to detect height changes caused by the
 * keyboard, then adjusts `Camera.top` so the block's centre sits within
 * the visible area.
 *
 * When editing ends or the keyboard closes, the camera is restored to its
 * original position.
 *
 * Intended to be called once in WovenCanvasCore, not per-block.
 */
export function useKeyboardAvoidance(scheduleTick: (cb: (ctx: Context) => void) => void) {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (!vv) return // no visualViewport support (SSR / old browser)

  const textEditorController = useTextEditorController()

  /** Camera position saved before any keyboard-induced pan. */
  let savedCamera: { left: number; top: number } | null = null

  /** Whether we've already applied an offset for the current edit session. */
  let panApplied = false

  /** Margin (in CSS px) to keep between the block bottom and the keyboard top. */
  const MARGIN_PX = 40

  /**
   * Minimum fraction of window.innerHeight that visualViewport.height must
   * shrink by to be considered a keyboard event rather than a window resize.
   * On desktop, both values stay in sync; on mobile the keyboard typically
   * consumes 30-50% of the screen.
   */
  const KEYBOARD_THRESHOLD = 0.2

  function isKeyboardVisible(): boolean {
    if (!vv) return false
    const heightDiff = window.innerHeight - vv.height
    return heightDiff > window.innerHeight * KEYBOARD_THRESHOLD
  }

  function handleViewportResize() {
    if (!vv) return

    // If the visual viewport shrank but not because of a keyboard, ignore.
    // On desktop resizes, innerHeight and visualViewport.height move together.
    if (!isKeyboardVisible()) {
      // Keyboard closed while editing — restore camera
      if (savedCamera && panApplied) {
        const saved = savedCamera
        savedCamera = null
        panApplied = false
        scheduleTick((ctx) => {
          const writableCamera = Camera.write(ctx)
          writableCamera.left = saved.left
          writableCamera.top = saved.top
        })
        textEditorController.repositionMenu()
      }
      return
    }

    scheduleTick((ctx) => {
      const editedEntities = editedBlockQuery.current(ctx)
      const entityId = editedEntities[Symbol.iterator]().next().value
      if (!entityId) return

      const block = Block.read(ctx, entityId)
      const camera = Camera.read(ctx)
      if (!block || !camera) return

      const zoom = camera.zoom

      // Block bounds in screen (CSS-pixel) coordinates
      const blockScreenTop = (block.position[1] - camera.top) * zoom
      const blockScreenBottom = (block.position[1] + block.size[1] - camera.top) * zoom

      // Visible viewport height (shrinks when keyboard opens)
      const visibleHeight = vv.height
      // Offset from top of layout viewport to top of visual viewport (iOS scroll)
      const vpOffsetTop = vv.offsetTop

      // Available visible band: vpOffsetTop .. vpOffsetTop + visibleHeight
      const visibleTop = vpOffsetTop
      const visibleBottom = vpOffsetTop + visibleHeight

      // Check if block is fully visible
      if (blockScreenBottom + MARGIN_PX <= visibleBottom && blockScreenTop >= visibleTop) {
        return // block is visible, nothing to do
      }

      // Save original camera position once per edit session
      if (!savedCamera) {
        savedCamera = { left: camera.left, top: camera.top }
      }

      // Target: centre the block vertically in the visible area
      const blockWorldCenterY = block.position[1] + block.size[1] / 2
      const visibleCentreScreenY = vpOffsetTop + visibleHeight / 2
      const newCameraTop = blockWorldCenterY - visibleCentreScreenY / zoom

      const writableCamera = Camera.write(ctx)
      writableCamera.top = newCameraTop
      panApplied = true

      textEditorController.repositionMenu()
    })
  }

  vv.addEventListener('resize', handleViewportResize)

  onUnmounted(() => {
    vv.removeEventListener('resize', handleViewportResize)
    // Restore camera if component unmounts while panned
    if (savedCamera && panApplied) {
      const saved = savedCamera
      savedCamera = null
      panApplied = false
      scheduleTick((ctx) => {
        const writableCamera = Camera.write(ctx)
        writableCamera.left = saved.left
        writableCamera.top = saved.top
      })
    }
  })
}
