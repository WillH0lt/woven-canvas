import type { Entity } from '@lastolivegames/becsy'
import BezierEasing from 'bezier-easing'

import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import { Aabb, Camera, CameraAnimation, CameraState, Persistent, Screen } from '../components'
import { CAMERA_SLIDE_SECONDS } from '../constants'
import { computeExtents, smoothDamp } from '../helpers'
import { Animation, type AnimationInput, CameraAnimationKind } from '../types'

export class UpdateCamera extends BaseSystem<CoreCommandArgs> {
  private readonly cameras = this.query((q) => q.current.addedOrChanged.with(Camera).write.trackWrites)

  private readonly cameraAnimation = this.singleton.read(CameraAnimation)

  private readonly cameraAnimations = this.query((q) => q.current.with(CameraAnimation).write)

  private readonly blocks = this.query((q) => q.current.with(Aabb, Persistent))

  private readonly screens = this.query((q) => q.addedOrChanged.with(Screen).trackWrites)

  private readonly cameraState = this.singleton.read(CameraState)

  private readonly cameraStateQuery = this.query((q) => q.current.with(CameraState).write)

  public initialize(): void {
    this.addCommandListener(CoreCommand.SetCamera, this.setCamera.bind(this))
    this.addCommandListener(CoreCommand.SetCameraVelocity, this.setCameraVelocity.bind(this))
    this.addCommandListener(CoreCommand.CancelCameraAnimation, this.cancelCameraAnimation.bind(this))
    this.addCommandListener(CoreCommand.FrameCameraToBlocks, this.frameCameraToBlocks.bind(this))
  }

  public execute(): void {
    this.executeCommands()

    if (this.cameraAnimation.active) {
      if (this.cameraAnimation.kind === CameraAnimationKind.SmoothDamp) {
        this._animateCameraSmoothDamp()
      } else if (this.cameraAnimation.kind === CameraAnimationKind.Bezier) {
        this._animateCameraBezier()
      }
    }

    if (this.cameras.addedOrChanged.length > 0 || this.screens.addedOrChanged.length > 0) {
      this.updateCameraState()
      // const camera = this.cameras.current[0].read(Camera)
      // camera.
    }
  }

  private _animateCameraBezier(): void {
    const animation = this.cameraAnimations.current[0].write(CameraAnimation)

    const b = animation.bezier
    const easing = BezierEasing(b[0], b[1], b[2], b[3])

    animation.elapsedMs += this.delta * 1000
    const t = Math.min(animation.elapsedMs / animation.durationMs, 1)
    const easedT = easing(t)

    const camera = this.cameras.current[0].write(Camera)

    const startCenter = [
      animation.startLeft + this.screen.width / animation.startZoom / 2,
      animation.startTop + this.screen.height / animation.startZoom / 2,
    ]

    const endCenter = [
      animation.endLeft + this.screen.width / animation.endZoom / 2,
      animation.endTop + this.screen.height / animation.endZoom / 2,
    ]

    // set zoom first so that left/top calculations are correct
    // zoom is exponential
    camera.zoom = animation.startZoom * (animation.endZoom / animation.startZoom) ** easedT

    camera.left = startCenter[0] + (endCenter[0] - startCenter[0]) * easedT - this.screen.width / camera.zoom / 2
    camera.top = startCenter[1] + (endCenter[1] - startCenter[1]) * easedT - this.screen.height / camera.zoom / 2

    if (t >= 1) {
      animation.active = false
    }
  }

  private _animateCameraSmoothDamp(): void {
    const animation = this.cameraAnimations.current[0].write(CameraAnimation)
    const camera = this.cameras.current[0].write(Camera)

    const { position, velocity: newVelocity } = smoothDamp(
      [camera.left, camera.top],
      animation.slideTarget,
      animation.velocity,
      CAMERA_SLIDE_SECONDS,
      Number.POSITIVE_INFINITY,
      this.delta,
    )

    animation.velocity = newVelocity
    camera.left = position[0]
    camera.top = position[1]

    const hasVelocity = Math.hypot(animation.velocity[0], animation.velocity[1]) > 0.1

    if (!hasVelocity) {
      animation.active = false
    }
  }

  private setCamera(payload: Partial<Camera>, animationInput: AnimationInput): void {
    const animation = parseAnimation(animationInput)
    if (animation === null) return

    if (animation.durationMs > 0) {
      const camera = this.cameras.current[0].read(Camera)

      const top = payload.top ?? camera.top
      const left = payload.left ?? camera.left
      const zoom = payload.zoom ?? camera.zoom

      const cameraAnimation = this.cameraAnimations.current[0].write(CameraAnimation)

      Object.assign(cameraAnimation, {
        active: true,
        kind: CameraAnimationKind.Bezier,
        bezier: animation.bezier,
        durationMs: animation.durationMs,
        elapsedMs: 0,
        startTop: camera.top,
        startLeft: camera.left,
        startZoom: camera.zoom,
        endTop: top,
        endLeft: left,
        endZoom: zoom,
      })
    } else {
      const camera = this.cameras.current[0].write(Camera)
      Object.assign(camera, payload)

      // stop any active animation
      const cameraAnimation = this.cameraAnimations.current[0].write(CameraAnimation)
      cameraAnimation.active = false
    }
  }

  private setCameraVelocity(velocity: { x: number; y: number }): void {
    const animation = this.cameraAnimations.current[0].write(CameraAnimation)

    Object.assign(animation, {
      active: true,
      kind: CameraAnimationKind.SmoothDamp,
      velocity: [velocity.x, velocity.y],
      slideTarget: [
        this.camera.left + velocity.x * CAMERA_SLIDE_SECONDS,
        this.camera.top + velocity.y * CAMERA_SLIDE_SECONDS,
      ],
    })
  }

  private cancelCameraAnimation(): void {
    const animation = this.cameraAnimations.current[0].write(CameraAnimation)
    animation.active = false
  }

  private frameCameraToBlocks(animationInput: AnimationInput): void {
    const animation = parseAnimation(animationInput)
    if (animation === null) return

    const aabb = computeExtents(this.blocks.current)

    let targetZoom = Math.min(
      this.screen.width / (aabb.right - aabb.left),
      this.screen.height / (aabb.bottom - aabb.top),
    )

    // add some padding so things aren't right at the edge of the screen
    targetZoom /= 1.1

    // don't zoom in, only out
    targetZoom = Math.min(targetZoom, this.camera.zoom)

    const targetTop = aabb.top + (aabb.bottom - aabb.top) / 2 - this.screen.height / targetZoom / 2
    const targetLeft = aabb.left + (aabb.right - aabb.left) / 2 - this.screen.width / targetZoom / 2

    if (animation.durationMs > 0) {
      const cameraAnimation = this.cameraAnimations.current[0].write(CameraAnimation)

      Object.assign(cameraAnimation, {
        active: true,
        kind: CameraAnimationKind.Bezier,
        bezier: animation.bezier,
        durationMs: animation.durationMs,
        elapsedMs: 0,
        startTop: this.camera.top,
        startLeft: this.camera.left,
        startZoom: this.camera.zoom,
        endTop: targetTop,
        endLeft: targetLeft,
        endZoom: targetZoom,
      })
    } else {
      const camera = this.cameras.current[0].write(Camera)
      camera.top = targetTop
      camera.left = targetLeft
      camera.zoom = targetZoom
    }
  }

  updateCameraState(): void {
    const camera = this.cameras.current[0].read(Camera)
    const cameraAabb = new Aabb({
      left: camera.left,
      top: camera.top,
      right: camera.left + this.screen.width / camera.zoom,
      bottom: camera.top + this.screen.height / camera.zoom,
    })

    if (this.cameraState.canSeeBlocks) {
      // check if we can still see blocks
      const aabb = this.cameraState.seenBlock?.read(Aabb)
      if (aabb?.intersectsAabb(cameraAabb)) {
        return
      }
    }

    // unfortunately we have to try intersecting everything
    // TODO update aabb to use a quadtree structure to target only nearby blocks
    let seenBlock: Entity | null = null
    for (const block of this.blocks.current) {
      const blockAabb = block.read(Aabb)
      if (cameraAabb.intersectsAabb(blockAabb)) {
        seenBlock = block
        break
      }
    }

    if (seenBlock === null && !this.cameraState.canSeeBlocks) {
      // we couldn't see any blocks before and still can't, so just return
      return
    }

    const cameraState = this.cameraStateQuery.current[0].write(CameraState)
    cameraState.canSeeBlocks = seenBlock !== null
    cameraState.seenBlock = seenBlock || null
  }
}

function parseAnimation(animationInput: AnimationInput): Animation | null {
  try {
    return Animation.parse(animationInput)
  } catch (e) {
    console.warn(e)
  }

  return null
}
