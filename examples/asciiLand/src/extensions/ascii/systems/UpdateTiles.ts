import { BaseSystem } from '@infinitecanvas/core'
import { Camera, Screen } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'

import { Tile } from '../components/index.js'
import type { AsciiResources } from '../types.js'

export class UpdateTiles extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly tiles = this.query((q) => q.current.with(Tile).write)

  private readonly screens = this.query((q) => q.addedOrChanged.with(Screen).trackWrites)

  private readonly cameras = this.query((q) => q.addedOrChanged.with(Camera).trackWrites)

  public execute(): void {
    if (this.cameras.addedOrChanged.length > 0 || this.screens.addedOrChanged.length > 0) {
      this.updateTiles()
    }
  }

  private updateTiles(): void {
    const { tileSize, maxTiles } = this.resources.tileConfig

    // largest possible values without causing overflow
    const boundX = Math.floor(2 ** 31 / tileSize[0])
    const boundY = Math.floor(2 ** 31 / tileSize[1])

    const minX = -boundX
    const minY = boundY - 1
    const maxX = boundX - 1
    const maxY = -boundY

    // get tiles in view (note that top < bottom)
    const left = Math.floor(this.camera.left / tileSize[0])
    const right = Math.ceil((this.camera.left + this.screen.width / this.camera.zoom) / tileSize[0])
    const top = Math.floor(this.camera.top / tileSize[1])
    const bottom = Math.ceil((this.camera.top + this.screen.height / this.camera.zoom) / tileSize[1])

    const cx = left + (right - left) / 2
    const cy = top + (bottom - top) / 2

    const candidates = []

    for (let x = left; x <= right; x++) {
      for (let y = top; y <= bottom; y++) {
        if (x < minX || x > maxX || y > minY || y < maxY) continue

        candidates.push({
          id: `tile|${x},${y}`,
          x,
          y,
          distSq: (cx - (x - 0.5)) ** 2 + (cy - (y - 0.5)) ** 2,
        })
      }
    }

    // sort by distance to center, keep closest maxTiles
    candidates.sort((a, b) => a.distSq - b.distSq)
    candidates.splice(maxTiles)

    // remove tiles that are no longer needed
    const candidateIds = new Set(candidates.map((c) => c.id))
    for (const tileEntity of this.tiles.current) {
      const tile = tileEntity.read(Tile)
      if (!candidateIds.has(tile.id)) {
        this.deleteEntity(tileEntity)
      }
    }

    // add new tiles
    for (const candidate of candidates) {
      const { x, y, id } = candidate

      const tileEntity = this.tiles.current.find((t: Entity) => {
        const tile = t.read(Tile)
        return tile.id === id
      })

      if (tileEntity) continue

      const top = y * tileSize[1]
      const left = x * tileSize[0]

      this.createEntity(Tile, {
        id,
        top,
        left,
        index: [x, y],
      })
    }
  }
}
