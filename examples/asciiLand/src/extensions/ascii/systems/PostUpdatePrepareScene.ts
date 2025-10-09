import { LexoRank } from '@dalet-oss/lexorank'
import { BaseSystem } from '@infinitecanvas/core'
import { Block, Camera, Screen } from '@infinitecanvas/core/components'
import { Mesh, PlaneGeometry } from 'three'
import { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'

const meshTags = ['ic-shape', 'ic-text']

export class PostUpdatePrepareScene extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly screens = this.query((q) => q.addedOrChanged.with(Screen).trackWrites)

  private readonly blocks = this.query((q) => q.added.addedOrChanged.current.removed.with(Block).trackWrites)

  private readonly cameras = this.query((q) => q.addedOrChanged.with(Camera).trackWrites)

  public execute(): void {
    let needsSorting = false

    if (this.frame.value === 1) {
      needsSorting = true
    }

    for (const blockEntity of this.blocks.added) {
      const block = blockEntity.read(Block)

      if (!meshTags.includes(block.tag)) continue

      const geometry = new PlaneGeometry(1, 1)
      geometry.translate(0.5, -0.5, 0)
      geometry.rotateY(Math.PI)
      geometry.rotateZ(Math.PI)

      const material = new LetterMaterial(this.resources.fontData, this.resources.assets.fontAtlas)

      const mesh = new Mesh(geometry, material)

      mesh.name = block.id
      mesh.userData.rank = block.rank
      this.resources.scene.add(mesh)
    }

    for (const blockEntity of this.blocks.addedOrChanged) {
      const block = blockEntity.read(Block)

      if (!meshTags.includes(block.tag)) continue

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      if (mesh.userData.rank !== block.rank) {
        needsSorting = true
      }

      mesh.position.set(block.left, block.top, 0)
      mesh.scale.set(block.width, block.height, 1)
      mesh.rotation.set(0, 0, block.rotateZ)

      mesh.userData.rank = block.rank

      const material = mesh.material as LetterMaterial
      const rows = Math.round(block.height / this.grid.rowHeight)
      const cols = Math.round(block.width / this.grid.colWidth)
      material.grid.value.x = cols
      material.grid.value.y = rows
    }

    if (this.blocks.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id)
      if (mesh) {
        this.resources.scene.remove(mesh)
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

      for (const mesh of this.resources.scene.children) {
        const order = objectOrderMap.get(mesh.name)
        if (order !== undefined) {
          // mesh.position.z = -order

          mesh.renderOrder = order
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
  }
}
