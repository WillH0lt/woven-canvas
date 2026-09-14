import {
  Block,
  defineEditorSystem,
  defineQuery,
  Edited,
  Grid,
  getKeyboardInput,
  isReadonly,
  Key,
  Keyboard,
  Selected,
  Tick,
  TransformBoxState,
  TransformBoxStateSingleton,
} from '@woven-canvas/core'
import { NudgeCamera, NudgeSelected } from '../commands'
import { KeyboardNudgeState } from '../components/KeyboardNudgeState'

const selectedBlocks = defineQuery((q) => q.with(Block, Selected))
const editedBlocks = defineQuery((q) => q.with(Block, Edited))
const arrowKeys = [Key.ArrowLeft, Key.ArrowRight, Key.ArrowUp, Key.ArrowDown]
const INITIAL_REPEAT_DELAY_MS = 300
const REPEAT_INTERVAL_MS = 1000 / 30

/** Arrow keys move the selection, or pan the camera when nothing is selected. */
export const CaptureNudgeSystem = defineEditorSystem({ phase: 'capture' }, (ctx) => {
  const pressed = getKeyboardInput(ctx, arrowKeys)
    .filter((event) => event.type === 'keyDown')
    .map((event) => event.key)
  const keyboard = Keyboard.read(ctx)
  const held = arrowKeys.some((key) => Keyboard.isKeyDown(ctx, key))
  const selected = selectedBlocks.current(ctx).length > 0
  const nextRepeatAt = KeyboardNudgeState.read(ctx).nextRepeatAt
  if (
    (!held && pressed.length === 0) ||
    keyboard.modDown ||
    keyboard.altDown ||
    TransformBoxStateSingleton.read(ctx).state === TransformBoxState.Editing ||
    editedBlocks.current(ctx).length > 0 ||
    (selected && isReadonly(ctx))
  ) {
    if (nextRepeatAt !== 0) KeyboardNudgeState.write(ctx).nextRepeatAt = 0
    return
  }

  const now = Tick.read(ctx).time
  if (pressed.length > 0) {
    // Every new arrow changes direction immediately. Only the first arrow has
    // an initial delay, so adding a second arrow cannot restart that delay.
    KeyboardNudgeState.write(ctx).nextRepeatAt =
      now + (nextRepeatAt === 0 ? INITIAL_REPEAT_DELAY_MS : REPEAT_INTERVAL_MS)
  } else {
    if (nextRepeatAt === 0 || now < nextRepeatAt) return
    // Keep a stable cadence, skipping missed repeats after a stalled frame.
    KeyboardNudgeState.write(ctx).nextRepeatAt =
      nextRepeatAt + (Math.floor((now - nextRepeatAt) / REPEAT_INTERVAL_MS) + 1) * REPEAT_INTERVAL_MS
  }

  // Include triggers so a quick press and release between frames still nudges.
  const active = (key: number) => Number(Keyboard.isKeyDown(ctx, key) || pressed.includes(key))
  const dx = active(Key.ArrowRight) - active(Key.ArrowLeft)
  const dy = active(Key.ArrowDown) - active(Key.ArrowUp)
  if (dx === 0 && dy === 0) return

  if (selected) {
    const step = keyboard.shiftDown ? 10 : 1
    const grid = Grid.read(ctx)
    const stepX = grid.enabled && grid.colWidth > 0 ? grid.colWidth : 1
    const stepY = grid.enabled && grid.rowHeight > 0 ? grid.rowHeight : 1
    NudgeSelected.spawn(ctx, { offset: [dx * step * stepX, dy * step * stepY] })
  } else {
    const step = keyboard.shiftDown ? 100 : 40
    NudgeCamera.spawn(ctx, { offset: [dx * step, dy * step] })
  }
})
