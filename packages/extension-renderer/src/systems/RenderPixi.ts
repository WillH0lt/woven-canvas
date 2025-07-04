import { comps } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'
import * as PIXI from 'pixi.js'

import type { RendererResources } from '../types'

export class RenderPixi extends System {
  private readonly screens = this.query((q) => q.changed.with(comps.Screen).trackWrites)

  private readonly blocks = this.query((q) => q.addedOrChanged.and.removed.with(comps.Block).trackWrites)

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  protected declare readonly resources: RendererResources

  public execute(): void {
    let needsSorting = false

    for (const blockEntity of this.blocks.addedOrChanged) {
      const block = blockEntity.read(comps.Block)

      let graphics = this.resources.viewport.getChildByLabel(block.id) as PIXI.Graphics
      if (!graphics) {
        // If the graphics object doesn't exist, create it
        graphics = new PIXI.Graphics()
        this.resources.viewport.addChild(graphics)
      }

      if (graphics.rank !== block.rank) {
        needsSorting = true
      }

      graphics.clear()
      const color = (block.red << 16) | (block.green << 8) | block.blue
      const alpha = block.alpha / 255
      graphics.rect(-block.width / 2, -block.height / 2, block.width, block.height)
      graphics.fill({ color, alpha })
      graphics.position.set(block.left + block.width / 2, block.top + block.height / 2)

      graphics.rotation = block.rotateZ
      graphics.label = block.id
      graphics.rank = block.rank

      if (block.id === '') {
        console.warn('Block does not have an ID:', block)
      }
    }

    if (this.blocks.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(comps.Block)

      // Remove the PIXI graphics object for the block
      const graphics = this.resources.viewport.getChildByLabel(block.id) as PIXI.Graphics
      if (graphics) {
        this.resources.viewport.removeChild(graphics)
        graphics.destroy({ children: true, texture: true })
      }
    }

    if (needsSorting) {
      this.resources.viewport.children.sort((a, b) => {
        const rankA = LexoRank.parse(a.rank ?? '0')
        const rankB = LexoRank.parse(b.rank ?? '0')
        return rankA.compareTo(rankB)
      })
    }

    // Handle domElement resizing
    if (this.screens.changed.length) {
      const screen = this.screens.changed[0].read(comps.Screen)
      this.resources.app.renderer.resize(screen.width, screen.height)
    }

    if (this.cameras.changed.length) {
      const camera = this.cameras.changed[0].read(comps.Camera)
      this.resources.viewport.scale.set(camera.zoom, camera.zoom)
      this.resources.viewport.position.set(-camera.left * camera.zoom, -camera.top * camera.zoom)
    }

    this.resources.app.render()
  }
}
