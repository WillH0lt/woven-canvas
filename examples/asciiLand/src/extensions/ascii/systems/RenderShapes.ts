import { LexoRank } from '@dalet-oss/lexorank'
import { BaseSystem } from '@infinitecanvas/core'
import { Aabb, Block, Camera, Opacity, Persistent, Screen, Text } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import type { Mesh } from 'three'

import { Shape, Tile } from '../components'
import type { TileMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderScene } from './RenderScene'

export class RenderShapes extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly tiles = this.query((q) => q.current.with(Tile))

  private readonly blocks = this.query(
    (q) => q.addedChangedOrRemoved.current.with(Block, Aabb, Persistent).trackWrites.using(Shape, Text).read,
  )

  private readonly texts = this.query((q) => q.added.with(Text).using(Opacity).write)

  private readonly screens = this.query((q) => q.addedOrChanged.with(Screen).trackWrites)

  private readonly cameras = this.query((q) => q.addedOrChanged.with(Camera).trackWrites)

  public constructor() {
    super()
    this.schedule((s) => s.after(RenderScene))
  }

  public execute(): void {
    if (
      this.blocks.addedChangedOrRemoved.length ||
      this.screens.addedOrChanged.length ||
      this.cameras.addedOrChanged.length
    ) {
      // figure out all the blocks that are visible on the screen
      let blocks = getVisibleBlocks(this.blocks.current, this.camera, this.screen)

      // sort blocks by rank
      blocks = blocks.sort((a, b) => {
        const rankA = a.read(Block).rank
        const rankB = b.read(Block).rank
        return LexoRank.parse(rankB).compareTo(LexoRank.parse(rankA))
      })

      for (const tileEntity of this.tiles.current) {
        this.render(tileEntity, blocks)
      }
    }

    for (const textEntity of this.texts.added) {
      textEntity.add(Opacity, { value: 128 })
    }
  }

  private render(tileEntity: Entity, blocks: Entity[]): void {
    const tile = tileEntity.read(Tile)
    const mesh = this.resources.scene.getObjectByName(tile.id) as Mesh | undefined
    const material = mesh?.material as TileMaterial
    if (!material) return

    // figure out which cells of the tile are visible on screen
    // Calculate the world bounds of the visible camera area
    const cameraWorldLeft = this.camera.left
    const cameraWorldRight = this.camera.left + this.screen.width / this.camera.zoom
    const cameraWorldTop = this.camera.top
    const cameraWorldBottom = this.camera.top + this.screen.height / this.camera.zoom

    // Calculate tile bounds
    const { clearColor, clearCharIndex } = this.resources.fontData
    // const { tileSize, tileGrid } = this.resources.tileConfig
    const tileRight = tile.left + tileSize[0]
    const tileBottom = tile.top + tileSize[1]

    // Find intersection of camera viewport with tile
    const intersectLeft = Math.max(cameraWorldLeft, tile.left)
    const intersectRight = Math.min(cameraWorldRight, tileRight)
    const intersectTop = Math.max(cameraWorldTop, tile.top)
    const intersectBottom = Math.min(cameraWorldBottom, tileBottom)

    // Convert intersection bounds to tile grid coordinates
    const startCol = Math.floor(((intersectLeft - tile.left) / tileSize[0]) * tileGrid[0])
    const endCol = Math.ceil(((intersectRight - tile.left) / tileSize[0]) * tileGrid[0])
    const startRow = Math.floor(((intersectTop - tile.top) / tileSize[1]) * tileGrid[1])
    const endRow = Math.ceil(((intersectBottom - tile.top) / tileSize[1]) * tileGrid[1])

    // Clamp the bounds to valid tile grid coordinates
    const clampedStartCol = Math.max(0, Math.min(startCol, tileGrid[0]))
    const clampedEndCol = Math.max(0, Math.min(endCol, tileGrid[0]))
    const clampedStartRow = Math.max(0, Math.min(startRow, tileGrid[1]))
    const clampedEndRow = Math.max(0, Math.min(endRow, tileGrid[1]))

    if (clampedEndCol <= clampedStartCol || clampedEndRow <= clampedStartRow) {
      // tile is completely off screen or no valid intersection
      return
    }

    // only consider blocks that intersect with this tile
    const tileBlocks = blocks.filter((b) => {
      const aabb = b.read(Aabb)
      return (
        aabb.left < tile.left + tileSize[0] &&
        aabb.right > tile.left &&
        aabb.top < tile.top + tileSize[1] &&
        aabb.bottom > tile.top
      )
    })

    material.chars.needsUpdate = true
    material.colors.needsUpdate = true
    if (tileBlocks.length === 0) {
      // no blocks intersect with this tile, so clear it out
      // material.chars.array.fill(clearCharIndex)
      // material.colors.array.fill(clearColor)
      return
    }

    for (let col = clampedStartCol; col < clampedEndCol; col++) {
      for (let row = clampedStartRow; row < clampedEndRow; row++) {
        const x = tile.left + ((col + 0.5) / tileGrid[0]) * tileSize[0]
        const y = tile.top + ((row + 0.5) / tileGrid[1]) * tileSize[1]
        const i = row * tileGrid[0] + col

        let hit = false

        for (const blockEntity of tileBlocks) {
          const aabb = blockEntity.read(Aabb)

          if (aabb.containsPoint([x, y])) {
            const block = blockEntity.read(Block)
            const localX = x - block.left
            const localY = y - block.top

            let char = clearCharIndex
            let color = clearColor
            if (block.tag === 'ic-text') {
              const result = this.renderText(blockEntity, [localX, localY])
              char = result.char
              color = result.color
            } else if (block.tag === 'ic-shape') {
              const result = this.renderShape(blockEntity, [localX, localY])
              char = result.char
              color = result.color
            }

            // material.chars.array[i] = char
            // material.colors.array[i] = color
            hit = true
            break
          }
        }

        if (!hit) {
          // material.chars.array[i] = clearCharIndex
          // material.colors.array[i] = clearColor
        }
      }
    }
  }

  private renderText(textEntity: Entity, pos: [number, number]): { char: number; color: number } {
    const unicodeMap = this.resources.assets.unicodeMap
    const block = textEntity.read(Block)
    const text = textEntity.read(Text)

    const colIndex = pos[0]
    const rowIndex = pos[1]
    // const textCols = Math.floor(block.width / text.fontSize)

    console.log('renderText', { pos, colIndex, rowIndex })

    const charIndex = colIndex
    const code = text.getStringContent().charCodeAt(charIndex)
    const char = unicodeMap.has(code) ? unicodeMap.get(code)! : this.resources.fontData.clearCharIndex
    const color = 255

    return { char, color }
  }

  private renderShape(shapeEntity: Entity, pos: [number, number]): { char: number; color: number } {
    const shape = shapeEntity.read(Shape)

    return { char: shape.char, color: shape.color }
  }
}

function getVisibleBlocks(allBlocks: readonly Entity[], camera: Camera, screen: Screen): Entity[] {
  const aabb = new Aabb({
    left: camera.left,
    top: camera.top,
    right: camera.left + screen.width / camera.zoom,
    bottom: camera.top + screen.height / camera.zoom,
  })

  const visibleBlocks: Entity[] = []
  for (const blockEntity of allBlocks) {
    const blockAabb = blockEntity.read(Aabb)

    if (blockAabb.intersectsAabb(aabb)) {
      visibleBlocks.push(blockEntity)
    }
  }

  return visibleBlocks
}
