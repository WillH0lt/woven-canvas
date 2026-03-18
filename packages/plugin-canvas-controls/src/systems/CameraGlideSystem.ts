import { Camera, defineEditorSystem, Frame, on, Screen } from '@woven-canvas/core'

import { GlideToPosition } from '../commands'
import { GlideState } from '../components/GlideState'
import { smoothDamp } from '../helpers'

/** How long the glide should take to reach the target (seconds) */
const GLIDE_SMOOTH_TIME = 0.3

/** Distance threshold below which the glide snaps to target */
const DISTANCE_THRESHOLD = 10

/**
 * Camera glide system - smoothly animates the camera toward a target position.
 *
 * Runs in the update phase so it writes camera after input systems.
 * PostInputPan's `cameraWasMoved` guard detects the external camera change
 * and goes idle, preventing conflicts.
 */
export const CameraGlideSystem = defineEditorSystem({ phase: 'update', priority: 100 }, (ctx) => {
  on(ctx, GlideToPosition, (ctx, { centerX, centerY }) => {
    const screen = Screen.read(ctx)
    const camera = Camera.read(ctx)

    const glide = GlideState.write(ctx)
    glide.active = true
    glide.targetLeft = centerX - screen.width / camera.zoom / 2
    glide.targetTop = centerY - screen.height / camera.zoom / 2
    glide.velocityX = 0
    glide.velocityY = 0
  })

  const glide = GlideState.read(ctx)
  if (!glide.active) return

  const frame = Frame.read(ctx)
  const camera = Camera.read(ctx)

  const { position, velocity } = smoothDamp(
    [camera.left, camera.top],
    [glide.targetLeft, glide.targetTop],
    [glide.velocityX, glide.velocityY],
    GLIDE_SMOOTH_TIME,
    Number.POSITIVE_INFINITY,
    frame.delta,
  )

  const dist = Math.hypot(position[0] - glide.targetLeft, position[1] - glide.targetTop)

  const w = GlideState.write(ctx)
  const cam = Camera.write(ctx)

  if (dist < DISTANCE_THRESHOLD) {
    cam.left = glide.targetLeft
    cam.top = glide.targetTop
    w.active = false
    w.velocityX = 0
    w.velocityY = 0
  } else {
    cam.left = position[0]
    cam.top = position[1]
    w.velocityX = velocity[0]
    w.velocityY = velocity[1]
  }
})
