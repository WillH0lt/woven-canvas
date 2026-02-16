import type { Aabb as AabbType, Vec2 } from '@infinitecanvas/math'
import { CanvasSingletonDef } from '@woven-ecs/canvas-store'
import { type Context, field } from '@woven-ecs/core'
import { Screen } from './Screen'

const CameraSchema = {
  /** Top position of the camera in world coordinates */
  top: field.float64().default(0),
  /** Left position of the camera in world coordinates */
  left: field.float64().default(0),
  /** Zoom level (1 = 100%, 2 = 200%, 0.5 = 50%) */
  zoom: field.float64().default(1),
  /** Whether the camera viewport intersects any blocks */
  canSeeBlocks: field.boolean().default(true),
  /** Reference to a block that the camera can currently see (for optimization) */
  lastSeenBlock: field.ref(),
}

/**
 * Camera singleton - tracks the viewport position and zoom in the infinite canvas.
 *
 * The camera defines the visible region of the world:
 * - `left` and `top` define the world coordinates of the top-left corner
 * - `zoom` scales the view (higher = zoomed in, lower = zoomed out)
 *
 * Screen coordinates can be converted to world coordinates using `toWorld()`.
 */
class CameraDef extends CanvasSingletonDef<typeof CameraSchema> {
  constructor() {
    super({ name: 'camera', sync: 'local' }, CameraSchema)
  }

  /**
   * Convert screen coordinates to world coordinates.
   * @param ctx - ECS context
   * @param screenPos - Position in screen pixels [x, y]
   * @returns Position in world coordinates [x, y]
   */
  toWorld(ctx: Context, screenPos: Vec2): Vec2 {
    const camera = this.read(ctx)
    const worldX = camera.left + screenPos[0] / camera.zoom
    const worldY = camera.top + screenPos[1] / camera.zoom
    return [worldX, worldY]
  }

  /**
   * Convert world coordinates to screen coordinates.
   * @param ctx - ECS context
   * @param worldPos - Position in world coordinates [x, y]
   * @returns Position in screen pixels [x, y]
   */
  toScreen(ctx: Context, worldPos: Vec2): Vec2 {
    const camera = this.read(ctx)
    const screenX = (worldPos[0] - camera.left) * camera.zoom
    const screenY = (worldPos[1] - camera.top) * camera.zoom
    return [screenX, screenY]
  }

  /**
   * Get the world coordinates of the viewport center.
   * @param ctx - ECS context
   * @returns Center position in world coordinates [x, y]
   */
  getWorldCenter(ctx: Context): Vec2 {
    const camera = this.read(ctx)
    const screen = Screen.read(ctx)
    return [camera.left + screen.width / camera.zoom / 2, camera.top + screen.height / camera.zoom / 2]
  }

  /**
   * Get the world-space bounds of the visible viewport.
   * @param ctx - ECS context
   * @returns Bounds as { left, top, right, bottom } in world coordinates
   */
  getWorldBounds(ctx: Context): {
    left: number
    top: number
    right: number
    bottom: number
  } {
    const camera = this.read(ctx)
    const screen = Screen.read(ctx)
    return {
      left: camera.left,
      top: camera.top,
      right: camera.left + screen.width / camera.zoom,
      bottom: camera.top + screen.height / camera.zoom,
    }
  }

  /**
   * Get the camera viewport as an AABB tuple [left, top, right, bottom].
   * @param ctx - ECS context
   * @param out - Optional output array to write to (avoids allocation)
   * @returns AABB tuple in world coordinates
   */
  getAabb(ctx: Context, out?: AabbType): AabbType {
    const camera = this.read(ctx)
    const screen = Screen.read(ctx)
    const result: AabbType = out ?? [0, 0, 0, 0]
    result[0] = camera.left
    result[1] = camera.top
    result[2] = camera.left + screen.width / camera.zoom
    result[3] = camera.top + screen.height / camera.zoom
    return result
  }
}

export const Camera = new CameraDef()
