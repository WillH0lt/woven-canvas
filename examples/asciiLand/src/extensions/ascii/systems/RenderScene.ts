import { BaseSystem } from '@infinitecanvas/core'
import { Block, Camera, Screen } from '@infinitecanvas/core/components'

import type { AsciiResources } from '../types'

export class RenderScene extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly screens = this.query((q) => q.addedOrChanged.with(Screen).trackWrites)

  private readonly blocks = this.query((q) => q.addedChangedOrRemoved.with(Block).trackWrites)

  private readonly cameras = this.query((q) => q.addedOrChanged.with(Camera).trackWrites)

  public execute(): void {
    if (
      this.cameras.addedOrChanged.length ||
      this.screens.addedOrChanged.length ||
      this.blocks.addedChangedOrRemoved.length
    ) {
      this.resources.renderer.render(this.resources.scene, this.resources.camera)
    }
  }
}
