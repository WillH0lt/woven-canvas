import type { Vec2 } from '@woven-canvas/math'
import { CanvasSingletonDef } from '@woven-ecs/canvas-store'
import { type Context, field } from '@woven-ecs/core'

const MouseSchema = {
  /** Current mouse position relative to the editor element [x, y] */
  position: field.tuple(field.float32(), 2).default([0, 0]),
  /** Horizontal wheel delta (positive = scroll right) */
  wheelDeltaX: field.float32().default(0),
  /** Vertical wheel delta (positive = scroll down), normalized across browsers */
  wheelDeltaY: field.float32().default(0),
  /** True for 1 frame when mouse moves */
  moveTrigger: field.boolean().default(false),
  /** True for 1 frame when wheel is scrolled */
  wheelTrigger: field.boolean().default(false),
  /** True for 1 frame when mouse enters the editor element */
  enterTrigger: field.boolean().default(false),
  /** True for 1 frame when mouse leaves the editor element */
  leaveTrigger: field.boolean().default(false),
}

/**
 * Mouse singleton - tracks mouse position and wheel events.
 *
 * Position is relative to the editor's DOM element (not the viewport).
 * Triggers are true for exactly 1 frame after the event occurs.
 */
class MouseDef extends CanvasSingletonDef<typeof MouseSchema> {
  constructor() {
    super({ name: 'mouse' }, MouseSchema)
  }

  /** Check if mouse moved this frame */
  didMove(ctx: Context): boolean {
    return this.read(ctx).moveTrigger
  }

  /** Check if wheel was scrolled this frame */
  didScroll(ctx: Context): boolean {
    return this.read(ctx).wheelTrigger
  }

  /** Check if mouse entered the editor element this frame */
  didEnter(ctx: Context): boolean {
    return this.read(ctx).enterTrigger
  }

  /** Check if mouse left the editor element this frame */
  didLeave(ctx: Context): boolean {
    return this.read(ctx).leaveTrigger
  }

  /** Get current mouse position as [x, y] */
  getPosition(ctx: Context): Vec2 {
    const m = this.read(ctx)
    return [m.position[0], m.position[1]]
  }

  /** Get wheel delta as [dx, dy] */
  getWheelDelta(ctx: Context): Vec2 {
    const m = this.read(ctx)
    return [m.wheelDeltaX, m.wheelDeltaY]
  }
}

export const Mouse = new MouseDef()
