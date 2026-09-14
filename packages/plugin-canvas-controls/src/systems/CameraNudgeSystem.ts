import {
  Block,
  Camera,
  defineEditorSystem,
  defineQuery,
  getFrameInput,
  getPluginResources,
  Key,
  Keyboard,
  Mouse,
  on,
  Selected,
} from '@woven-canvas/core'
import { NudgeCamera } from '../commands'
import { GlideState, ScrollState, ZoomState } from '../components'
import { CameraNudgeState } from '../components/CameraNudgeState'
import { CONTROLS_PLUGIN_NAME } from '../constants'
import { clampCameraToBounds } from '../helpers/clampCameraToBounds'
import { smoothDamp } from '../helpers/smoothDamp'
import type { CanvasControlsOptions } from '../types'

const selectedBlocks = defineQuery((q) => q.with(Block, Selected))
const panKeys = new Set<number>([
  Key.ArrowLeft,
  Key.ArrowRight,
  Key.ArrowUp,
  Key.ArrowDown,
  Key.ShiftLeft,
  Key.ShiftRight,
])
const otherKeys = Object.values(Key).filter((key) => !panKeys.has(key))

/** Accumulate and animate keyboard pans without changing wheel scrolling. */
export const CameraNudgeSystem = defineEditorSystem({ phase: 'update', priority: 110 }, (ctx) => {
  const current = Camera.read(ctx)
  const previous = CameraNudgeState.read(ctx)
  if (
    previous.active &&
    (current.left !== previous.expectedLeft ||
      current.top !== previous.expectedTop ||
      current.zoom !== previous.expectedZoom ||
      selectedBlocks.current(ctx).length > 0 ||
      Mouse.read(ctx).wheelTrigger ||
      otherKeys.some((key) => Keyboard.isKeyDownTrigger(ctx, key)))
  )
    CameraNudgeState.write(ctx).active = false

  const { cameraBounds, smoothScroll } = getPluginResources<CanvasControlsOptions>(ctx, CONTROLS_PLUGIN_NAME)
  on(ctx, NudgeCamera, (ctx, { offset }) => {
    GlideState.write(ctx).active = false
    ZoomState.reset(ctx)
    ScrollState.reset(ctx)
    const camera = Camera.read(ctx)
    const nudge = CameraNudgeState.read(ctx)
    const target = {
      left: (nudge.active ? nudge.targetLeft : camera.left) + offset[0] / camera.zoom,
      top: (nudge.active ? nudge.targetTop : camera.top) + offset[1] / camera.zoom,
      zoom: camera.zoom,
    }
    // Clamp the target so held keys cannot build up motion beyond a boundary.
    if (cameraBounds) clampCameraToBounds(ctx, target, cameraBounds)

    if (!smoothScroll.enabled) {
      CameraNudgeState.write(ctx).active = false
      const cam = Camera.write(ctx)
      cam.left = target.left
      cam.top = target.top
      return
    }

    const state = CameraNudgeState.write(ctx)
    if (!state.active) {
      state.velocityX = 0
      state.velocityY = 0
    }
    state.active = true
    state.targetLeft = target.left
    state.targetTop = target.top
  })

  const state = CameraNudgeState.read(ctx)
  if (!state.active) return
  const camera = Camera.read(ctx)
  const { position, velocity } = smoothDamp(
    [camera.left, camera.top],
    [state.targetLeft, state.targetTop],
    [state.velocityX, state.velocityY],
    smoothScroll.time,
    Number.POSITIVE_INFINITY,
    getFrameInput(ctx).delta,
  )
  const done =
    Math.hypot(position[0] - state.targetLeft, position[1] - state.targetTop) < 0.1 &&
    Math.hypot(velocity[0], velocity[1]) < 0.5
  const cam = Camera.write(ctx)
  cam.left = done ? state.targetLeft : position[0]
  cam.top = done ? state.targetTop : position[1]
  if (cameraBounds) clampCameraToBounds(ctx, cam, cameraBounds)
  const next = CameraNudgeState.write(ctx)
  next.active = !done
  next.velocityX = done ? 0 : velocity[0]
  next.velocityY = done ? 0 : velocity[1]
  next.expectedLeft = cam.left
  next.expectedTop = cam.top
  next.expectedZoom = cam.zoom
})
