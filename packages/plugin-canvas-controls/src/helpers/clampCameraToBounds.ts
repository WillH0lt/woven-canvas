import type { Context } from '@woven-canvas/core'
import { Screen } from '@woven-canvas/core'

import type { CameraBounds } from '../types'

export function clampCameraToBounds(
  ctx: Context,
  cam: { left: number; top: number; zoom: number },
  bounds: CameraBounds,
) {
  const screen = Screen.read(ctx)
  const viewWidth = screen.width / cam.zoom
  const viewHeight = screen.height / cam.zoom

  const _beforeLeft = cam.left
  const _beforeTop = cam.top

  if (bounds.restrict === 'center') {
    const centerX = cam.left + viewWidth / 2
    const centerY = cam.top + viewHeight / 2

    cam.left += Math.max(bounds.left, Math.min(centerX, bounds.right)) - centerX
    cam.top += Math.max(bounds.top, Math.min(centerY, bounds.bottom)) - centerY
  } else {
    const boundsWidth = bounds.right - bounds.left
    const boundsHeight = bounds.bottom - bounds.top

    if (viewWidth >= boundsWidth) {
      cam.left = bounds.left - (viewWidth - boundsWidth) / 2
    } else {
      cam.left = Math.max(bounds.left, Math.min(cam.left, bounds.right - viewWidth))
    }

    if (viewHeight >= boundsHeight) {
      cam.top = bounds.top - (viewHeight - boundsHeight) / 2
    } else {
      cam.top = Math.max(bounds.top, Math.min(cam.top, bounds.bottom - viewHeight))
    }
  }
}
