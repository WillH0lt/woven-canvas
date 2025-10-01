import type { Entity } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import type { CoreCommandArgs } from '../commands'
import { Block, Camera, ScaleWithZoom } from '../components'
import { approximatelyEqual } from '../helpers'
import { PostUpdateDeleter } from './PostUpdateDeleter'
import { PostUpdateHistory } from './PostUpdateHistory'
import { PostUpdateSessionSync } from './PostUpdateSessionSync'

export class PostUpdateScaleWithZoom extends BaseSystem<CoreCommandArgs> {
  private readonly scaleWithZoomBlocks = this.query(
    (q) => q.addedOrChanged.current.with(Block).write.and.with(ScaleWithZoom).trackWrites,
  )

  private readonly camerasQuery = this.query((q) => q.addedOrChanged.with(Camera).trackWrites)

  public constructor() {
    super()

    this.schedule((s) => s.inAnyOrderWith(PostUpdateDeleter, PostUpdateHistory, PostUpdateSessionSync))
  }

  // TODO don't save state in a system, move this to a component
  private lastZoom = 1

  public execute(): void {
    if (this.camerasQuery.addedOrChanged.length > 0) {
      if (!approximatelyEqual(this.camera.zoom, this.lastZoom)) {
        for (const blockEntity of this.scaleWithZoomBlocks.current) {
          this.scaleBlock(blockEntity)
        }

        this.lastZoom = this.camera.zoom
        return
      }
    }

    for (const blockEntity of this.scaleWithZoomBlocks.addedOrChanged) {
      this.scaleBlock(blockEntity)
    }
  }

  private scaleBlock(blockEntity: Entity): void {
    const block = blockEntity.write(Block)
    const swz = blockEntity.read(ScaleWithZoom)

    const scale = 1 / this.camera.zoom

    const width = swz.startWidth * scale
    const height = swz.startHeight * scale
    const left = swz.startLeft + (swz.startWidth - width) * swz.anchor[0]
    const top = swz.startTop + (swz.startHeight - height) * swz.anchor[1]

    block.width = width
    block.height = height
    block.left = left
    block.top = top
  }
}
