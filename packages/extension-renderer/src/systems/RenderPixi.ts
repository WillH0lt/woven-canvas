import { comps } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import * as PIXI from 'pixi.js'

import type { RendererResources } from '../types'

export class RenderPixi extends System {
  private readonly screen = this.singleton.read(comps.Screen)

  private readonly blocks = this.query((q) => q.addedOrChanged.and.removed.with(comps.Block, comps.ZIndex).trackWrites)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly resources!: RendererResources

  public execute(): void {
    for (const blockEntity of this.blocks.addedOrChanged) {
      const block = blockEntity.read(comps.Block)

      let graphics = this.resources.viewport.getChildByLabel(block.id) as PIXI.Graphics
      if (!graphics) {
        // If the graphics object doesn't exist, create it
        graphics = new PIXI.Graphics()
        this.resources.viewport.addChild(graphics)
      }

      graphics.clear()
      const color = (block.red << 16) | (block.green << 8) | block.blue
      const alpha = block.alpha / 255
      graphics.rect(-block.width / 2, -block.height / 2, block.width, block.height)
      graphics.fill({ color, alpha })
      graphics.position.set(block.left + block.width / 2, block.top + block.height / 2)

      // apply rotateZ around the center of the block
      // graphics.pivot.set(block.left, block.top)
      graphics.rotation = block.rotateZ

      graphics.zIndex = blockEntity.read(comps.ZIndex).value
      graphics.label = block.id

      if (block.id === '') {
        console.warn('Block does not have an ID:', block)
      }
    }

    // for (const blockEntity of this.blocks.changed) {
    //   const block = blockEntity.read(comps.Block)

    //   // Update the existing PIXI graphics object for the block
    //   const graphics = this.resources.pixiApp.stage.getChildByLabel(block.id) as PIXI.Graphics
    //   if (graphics) {
    //     graphics.clear()
    //     const color = (block.red << 16) | (block.green << 8) | block.blue
    //     const alpha = block.alpha / 255

    //     graphics.rect(block.left, block.top, block.width, block.height).fill({ color, alpha })
    //     graphics.zIndex = blockEntity.read(comps.ZIndex).value
    //   }
    // }

    if (this.blocks.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(comps.Block)

      // Remove the PIXI graphics object for the block
      const graphics = this.resources.viewport.getChildByLabel(block.id) as PIXI.Graphics
      if (graphics) {
        this.resources.viewport.removeChild(graphics)
      }
    }

    // Handle domElement resizing
    if (this.screen.resizedTrigger) {
      const { clientWidth, clientHeight } = this.resources.domElement
      this.resources.app.renderer.resize(clientWidth, clientHeight)
    }

    this.resources.viewport.scale.set(this.camera.zoom, this.camera.zoom)
    this.resources.viewport.position.set(-this.camera.left * this.camera.zoom, -this.camera.top * this.camera.zoom)

    this.resources.app.render()
  }
}
