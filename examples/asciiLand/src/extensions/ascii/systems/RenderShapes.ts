import { LexoRank } from '@dalet-oss/lexorank'
import { BaseSystem } from '@infinitecanvas/core'
import { Aabb, Block, Camera, Persistent, Screen } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import type { Mesh } from 'three'

import { Shape, Tile } from '../components'
import { CLEAR_CHAR_INDEX, CLEAR_COLOR, TILE_GRID, TILE_SIZE } from '../constants'
import type { TileMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderScene } from './RenderScene'

export class RenderShapes extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly tiles = this.query((q) => q.current.with(Tile, Aabb))

  private readonly blocks = this.query(
    (q) => q.addedChangedOrRemoved.current.with(Block, Aabb, Persistent, Shape).trackWrites,
  )

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
    const tileRight = tile.left + TILE_SIZE[0]
    const tileBottom = tile.top + TILE_SIZE[1]

    // Find intersection of camera viewport with tile
    const intersectLeft = Math.max(cameraWorldLeft, tile.left)
    const intersectRight = Math.min(cameraWorldRight, tileRight)
    const intersectTop = Math.max(cameraWorldTop, tile.top)
    const intersectBottom = Math.min(cameraWorldBottom, tileBottom)

    // Convert intersection bounds to tile grid coordinates
    const startCol = Math.floor(((intersectLeft - tile.left) / TILE_SIZE[0]) * TILE_GRID[0])
    const endCol = Math.ceil(((intersectRight - tile.left) / TILE_SIZE[0]) * TILE_GRID[0])
    const startRow = Math.floor(((intersectTop - tile.top) / TILE_SIZE[1]) * TILE_GRID[1])
    const endRow = Math.ceil(((intersectBottom - tile.top) / TILE_SIZE[1]) * TILE_GRID[1])

    // Clamp the bounds to valid tile grid coordinates
    const clampedStartCol = Math.max(0, Math.min(startCol, TILE_GRID[0]))
    const clampedEndCol = Math.max(0, Math.min(endCol, TILE_GRID[0]))
    const clampedStartRow = Math.max(0, Math.min(startRow, TILE_GRID[1]))
    const clampedEndRow = Math.max(0, Math.min(endRow, TILE_GRID[1]))

    if (clampedEndCol <= clampedStartCol || clampedEndRow <= clampedStartRow) {
      // tile is completely off screen or no valid intersection
      return
    }

    // only consider blocks that intersect with this tile
    const tileBlocks = blocks.filter((b) => {
      const aabb = b.read(Aabb)
      return (
        aabb.left < tile.left + TILE_SIZE[0] &&
        aabb.right > tile.left &&
        aabb.top < tile.top + TILE_SIZE[1] &&
        aabb.bottom > tile.top
      )
    })

    material.chars.needsUpdate = true
    material.colors.needsUpdate = true
    if (tileBlocks.length === 0) {
      // no blocks intersect with this tile, so clear it out
      material.chars.array.fill(CLEAR_CHAR_INDEX)
      material.colors.array.fill(CLEAR_COLOR)
      return
    }

    for (let col = clampedStartCol; col < clampedEndCol; col++) {
      for (let row = clampedStartRow; row < clampedEndRow; row++) {
        const x = tile.left + ((col + 0.5) / TILE_GRID[0]) * TILE_SIZE[0]
        const y = tile.top + ((row + 0.5) / TILE_GRID[1]) * TILE_SIZE[1]
        const i = row * TILE_GRID[0] + col

        let hit = false

        for (const blockEntity of tileBlocks) {
          const aabb = blockEntity.read(Aabb)
          if (aabb.containsPoint([x, y])) {
            const color = blockEntity.read(Shape).color

            material.chars.array[i] = 12
            material.colors.array[i] = color
            hit = true
            break
          }
        }

        if (!hit) {
          material.chars.array[i] = CLEAR_CHAR_INDEX
          material.colors.array[i] = CLEAR_COLOR
        }
      }
    }
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

// function intersectTiles(blockEntity: Entity, tileEntities: readonly Entity[]): Entity[] {
//   const aabb = new Aabb(blockEntity.read(Aabb).toJson())

//   const intersects: Entity[] = []
//   for (const tileEntity of tileEntities) {
//     const tileAabb = tileEntity.read(Aabb)

//     // console.log(tileAabb.toJson(), aabb.toJson())

//     if (tileAabb.intersectsAabb(aabb)) {
//       intersects.push(tileEntity)
//     }
//   }

//   return intersects
// }
