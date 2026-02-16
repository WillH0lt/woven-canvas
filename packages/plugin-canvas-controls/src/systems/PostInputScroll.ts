import { Camera, type Context, Controls, defineEditorSystem, getMouseInput, Keyboard } from '@woven-canvas/core'

/**
 * Post input scroll system - handles mouse scroll canvas panning.
 *
 * Pans the canvas based on wheel deltas. Only active when
 * the "scroll" tool is active for wheel input.
 *
 * Runs late in the input phase (priority: -100) to process input after
 * core input systems have updated singletons.
 *
 * Active when: Mouse wheel scrolled and "scroll" tool is active.
 */
export const PostInputScroll = defineEditorSystem({ phase: 'input', priority: -100 }, (ctx: Context) => {
  const keyboard = Keyboard.read(ctx)

  // Only scroll when the scroll tool is active for wheel input
  if (!Controls.wheelActive(ctx, 'scroll', keyboard.modDown)) return

  // Check for wheel event
  const mouseEvents = getMouseInput(ctx)
  const wheelEvent = mouseEvents.find((e) => e.type === 'wheel')
  if (!wheelEvent) return

  const camera = Camera.read(ctx)

  // Pan camera based on wheel deltas, adjusted for zoom level
  const left = camera.left + wheelEvent.wheelDeltaX / camera.zoom
  const top = camera.top + wheelEvent.wheelDeltaY / camera.zoom

  // Update camera
  const cam = Camera.write(ctx)
  cam.left = left
  cam.top = top
})
