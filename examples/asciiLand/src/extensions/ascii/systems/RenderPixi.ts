import { LexoRank } from '@dalet-oss/lexorank'
import { BaseSystem } from '@infinitecanvas/core'
import { Block, Camera, Screen } from '@infinitecanvas/core/components'
import * as PIXI from 'pixi.js'
import type { AsciiResources } from '../types'

import { Shape } from '../components/Shape'

export class RenderPixi extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly screens = this.query((q) => q.changed.with(Screen).trackWrites)

  private readonly blocks = this.query((q) => q.addedOrChanged.and.removed.with(Block).trackWrites)

  private readonly shapes = this.query((q) => q.addedOrChanged.with(Block, Shape).trackWrites)

  private readonly cameras = this.query((q) => q.changed.with(Camera).trackWrites)

  public execute(): void {
    let needsSorting = false

    for (const shapeEntity of this.shapes.addedOrChanged) {
      const block = shapeEntity.read(Block)

      let shapeObj = this.resources.viewport.getChildByLabel(block.id) as PIXI.Graphics
      if (!shapeObj) {
        shapeObj = new PIXI.Graphics()
        shapeObj.label = block.id
      }

      const shape = shapeEntity.read(Shape)
      shapeObj.clear()
      const fillColor = (shape.fillRed << 16) | (shape.fillGreen << 8) | shape.fillBlue
      const alpha = shape.fillAlpha / 255
      shapeObj.rect(-block.width / 2, -block.height / 2, block.width, block.height)
      shapeObj.fill(fillColor, alpha)

      this.resources.viewport.addChild(shapeObj)
    }

    for (const blockEntity of this.blocks.addedOrChanged) {
      const block = blockEntity.read(Block)

      const blockObj = this.resources.viewport.getChildByLabel(block.id) as PIXI.Container

      if (!blockObj) {
        // console.warn('Block does not have a PIXI object:', block)
        continue
      }

      if (blockObj.rank !== block.rank) {
        needsSorting = true
      }

      blockObj.position.set(block.left + block.width / 2, block.top + block.height / 2)
      // blockObj.position.set(block.left, block.top)
      blockObj.rotation = block.rotateZ
      blockObj.rank = block.rank

      if (block.id === '') {
        console.warn('Block does not have an ID:', block)
      }
    }

    if (this.blocks.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(Block)

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
      const screen = this.screens.changed[0].read(Screen)
      this.resources.app.renderer.resize(screen.width, screen.height)
    }

    if (this.cameras.changed.length) {
      const camera = this.cameras.changed[0].read(Camera)
      this.resources.viewport.scale.set(camera.zoom, camera.zoom)
      this.resources.viewport.position.set(-camera.left * camera.zoom, -camera.top * camera.zoom)
    }

    this.resources.app.render()
  }
}
