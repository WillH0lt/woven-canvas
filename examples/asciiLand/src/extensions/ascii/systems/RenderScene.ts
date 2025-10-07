import { LexoRank } from '@dalet-oss/lexorank'
import { BaseSystem } from '@infinitecanvas/core'
import { Block, Camera, Screen } from '@infinitecanvas/core/components'
import { Mesh, PlaneGeometry } from 'three'

import { Shape, Tile } from '../components'
import { ATLAS_CELL_SIZE, ATLAS_GRID, CLEAR_CHAR_INDEX, CLEAR_COLOR, TILE_GRID, TILE_SIZE } from '../constants'
import { TileMaterial } from '../materials'
import type { AsciiResources } from '../types'

export class RenderScene extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly tiles = this.query((q) => q.added.removed.with(Tile))

  private readonly screens = this.query((q) => q.addedOrChanged.with(Screen).trackWrites)

  private readonly blocks = this.query((q) => q.addedOrChanged.current.removed.with(Block).trackWrites)

  private readonly shapes = this.query((q) => q.addedOrChanged.with(Block, Shape).trackWrites)

  private readonly cameras = this.query((q) => q.addedOrChanged.with(Camera).trackWrites)

  public execute(): void {
    let needsSorting = false

    // handle added tiles
    for (const tileEntity of this.tiles.added) {
      const tile = tileEntity.read(Tile)

      const geometry = new PlaneGeometry(1, 1)
      geometry.translate(0.5, -0.5, 0)
      geometry.rotateY(Math.PI)
      geometry.rotateZ(Math.PI)
      const material = new TileMaterial({
        clearColor: CLEAR_COLOR,
        atlas: this.resources.assets.fontAtlas,
        tileGrid: TILE_GRID,
        atlasGrid: ATLAS_GRID,
        atlasCellSize: ATLAS_CELL_SIZE,
        clearCharIndex: CLEAR_CHAR_INDEX,
      })

      const tileObject = new Mesh(geometry, material)
      tileObject.scale.set(TILE_SIZE[0], TILE_SIZE[1], 1)
      tileObject.position.set(tile.left, tile.top, 0)
      tileObject.name = tile.id

      this.resources.scene.add(tileObject)
    }

    // remove tiles
    if (this.tiles.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const tileEntity of this.tiles.removed) {
      const tileObj = this.resources.scene.getObjectByName(tileEntity.read(Tile).id) as Mesh | undefined
      if (tileObj) {
        const mat = (tileObj as Mesh).material as TileMaterial
        mat.dispose()
        tileObj.geometry.dispose()
        this.resources.scene.remove(tileObj)
      }
    }

    for (const blockEntity of this.blocks.addedOrChanged) {
      const block = blockEntity.read(Block)

      const blockObj = this.resources.scene.getObjectByName(block.id) as Mesh
      if (!blockObj) continue

      if (blockObj.userData.rank !== block.rank) {
        needsSorting = true
      }

      blockObj.position.set(block.left, block.top, 0)
      blockObj.scale.set(block.width, block.height, 1)
      blockObj.rotation.set(0, 0, block.rotateZ)

      blockObj.userData.rank = block.rank
    }

    if (this.blocks.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(Block)

      const blockObj = this.resources.scene.getObjectByName(block.id)
      if (blockObj) {
        this.resources.scene.remove(blockObj)
      }
    }

    if (needsSorting) {
      const objectOrderMap = new Map<string, number>()

      const entities = this.blocks.current.slice().sort((a, b) => {
        const rankA = LexoRank.parse(a.read(Block).rank)
        const rankB = LexoRank.parse(b.read(Block).rank)
        return rankA.compareTo(rankB)
      })

      for (const [index, entity] of entities.entries()) {
        objectOrderMap.set(entity.read(Block).id, index)
      }

      for (const obj of this.resources.scene.children) {
        const order = objectOrderMap.get(obj.name)
        if (order !== undefined) {
          obj.renderOrder = order
        }
      }
    }

    // Handle domElement resizing
    if (this.screens.addedOrChanged.length) {
      const { camera, renderer } = this.resources

      camera.left = -this.screen.width / 2
      camera.right = this.screen.width / 2
      camera.top = this.screen.height / 2
      camera.bottom = -this.screen.height / 2
      renderer.setSize(this.screen.width, this.screen.height)
    }

    if (this.cameras.addedOrChanged.length || this.screens.addedOrChanged.length) {
      this.resources.camera.zoom = this.camera.zoom
      this.resources.camera.position.set(
        this.camera.left + (0.5 * this.screen.width) / this.camera.zoom,
        this.camera.top + (0.5 * this.screen.height) / this.camera.zoom,
        -100,
      )
      this.resources.camera.up.set(0, -1, 0)
      this.resources.camera.rotation.set(0, Math.PI, Math.PI)
      this.resources.camera.updateProjectionMatrix()
      this.resources.camera.updateMatrixWorld()
    }

    // this.resources.scene.traverse((obj) => {
    //   if (obj instanceof Mesh) {
    //     const mat = obj.material as TileMaterial

    //     const rng = () => 12 * 8 * Math.random()

    //     // console.log(mat.chars.array)
    //     // if (mat.chars.value) {
    //     // mat.chars.array[0] = Math.floor(rng())
    //     // }

    //     mat.chars.array = new Array(mat.chars.array.length).fill(0).map(() => Math.floor(rng()))
    //     // mat.color.value = new Color(Math.random(), Math.random(), Math.random())
    //   }
    // })

    this.resources.renderer.render(this.resources.scene, this.resources.camera)
  }
}
