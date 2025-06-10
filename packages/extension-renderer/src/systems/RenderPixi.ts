import { comps } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import * as PIXI from 'pixi.js'

import type { RendererResources } from '../types'

export class RenderPixi extends System {
  private readonly screen = this.singleton.read(comps.Screen)

  private readonly blocks = this.query((q) => q.added.and.changed.and.removed.with(comps.Block).trackWrites)

  private readonly resources!: RendererResources

  public execute(): void {
    for (const blockEntity of this.blocks.added) {
      const block = blockEntity.read(comps.Block)

      // Create a PIXI graphics object for the block
      const graphics = new PIXI.Graphics()
      const color = (block.red << 16) | (block.green << 8) | block.blue
      graphics.rect(block.left, block.top, block.width, block.height).fill(color)
      graphics.label = block.id // Set the name to the block ID for easy retrieval

      // Add the graphics object to the PIXI application
      this.resources.pixiApp.stage.addChild(graphics)
    }

    for (const blockEntity of this.blocks.changed) {
      const block = blockEntity.read(comps.Block)

      // Update the existing PIXI graphics object for the block
      const graphics = this.resources.pixiApp.stage.getChildByLabel(block.id) as PIXI.Graphics
      if (graphics) {
        graphics.clear()
        const color = (block.red << 16) | (block.green << 8) | block.blue
        const alpha = block.alpha / 255

        graphics.rect(block.left, block.top, block.width, block.height).fill({ color, alpha })
      }
    }

    if (this.blocks.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(comps.Block)

      // Remove the PIXI graphics object for the block
      const graphics = this.resources.pixiApp.stage.getChildByLabel(block.id) as PIXI.Graphics
      if (graphics) {
        this.resources.pixiApp.stage.removeChild(graphics)
      }
    }

    // Handle domElement resizing
    if (this.screen.resizedTrigger) {
      const { clientWidth, clientHeight } = this.resources.domElement
      this.resources.pixiApp.renderer.resize(clientWidth, clientHeight)
    }

    // Render the PIXI application
    this.resources.pixiApp.render()
  }
}
