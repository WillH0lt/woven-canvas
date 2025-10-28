import { LexoRank } from '@dalet-oss/lexorank'
import { BaseSystem } from '@infinitecanvas/core'
import { Block, Camera, Connector, Hovered, Opacity, Screen, Selected } from '@infinitecanvas/core/components'
import { binarySearchForId, uuidToNumber } from '@infinitecanvas/core/helpers'
import { Mesh, PlaneGeometry } from 'three'

import type { Entity } from '@lastolivegames/becsy'
import { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'

const meshTags = ['ascii-shape', 'ic-text', 'ic-elbow-arrow']

export class PreRenderPrepareScene extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly screens = this.query((q) => q.addedOrChanged.with(Screen).trackWrites)

  private readonly blocks = this.query(
    (q) =>
      q.added.addedOrChanged.current.removed
        .with(Block)
        .trackWrites.using(Connector)
        .read.orderBy((e) => uuidToNumber(e.read(Block).id)).usingAll.write,
  )

  private readonly selectedBlocks = this.query((q) => q.added.removed.with(Block, Selected))

  private readonly hoveredBlocks = this.query((q) => q.added.removed.with(Block, Hovered))

  private readonly cameras = this.query((q) => q.addedOrChanged.with(Camera).trackWrites)

  private readonly opacityBlocks = this.query((q) => q.addedOrChanged.removed.with(Block).and.with(Opacity).trackWrites)

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

      const material = new LetterMaterial(
        this.resources.fontData,
        this.resources.assets.fontAtlas,
        this.resources.assets.unicodeMap,
        64,
        64,
      )
      const mesh = new Mesh(geometry, material)

      mesh.name = block.id
      mesh.userData.rank = this.getRank(blockEntity)
      this.resources.scene.add(mesh)
      needsSorting = true
    }

    for (const blockEntity of this.blocks.addedOrChanged) {
      const block = blockEntity.read(Block)

      if (!meshTags.includes(block.tag)) continue

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      mesh.position.set(block.left, block.top, 0)
      mesh.scale.set(block.width, block.height, 1)
      mesh.rotation.set(0, 0, block.rotateZ)

      const meshRank = mesh.userData.rank
      const blockRank = this.getRank(blockEntity)
      if (meshRank !== blockRank) {
        needsSorting = true
      }

      mesh.userData.rank = blockRank
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
      this.sortMeshesByRank()
    }

    // ========================================================
    // selected blocks
    for (const blockEntity of this.selectedBlocks.added) {
      const material = this.getMaterial<LetterMaterial>(blockEntity)
      if (!material) continue
      material.selected.value = true
    }

    if (this.selectedBlocks.removed.length > 0) {
      this.accessRecentlyDeletedData()
    }
    for (const blockEntity of this.selectedBlocks.removed) {
      if (!blockEntity.alive || !blockEntity.has(Block)) continue
      const material = this.getMaterial<LetterMaterial>(blockEntity)
      if (!material) continue
      material.selected.value = false
    }

    // ========================================================
    // hovered blocks
    for (const blockEntity of this.hoveredBlocks.added) {
      const material = this.getMaterial<LetterMaterial>(blockEntity)
      if (!material) continue
      material.hovered.value = true
    }

    if (this.hoveredBlocks.removed.length > 0) {
      this.accessRecentlyDeletedData()
    }
    for (const blockEntity of this.hoveredBlocks.removed) {
      if (!blockEntity.alive || !blockEntity.has(Block)) continue
      const material = this.getMaterial<LetterMaterial>(blockEntity)
      if (!material) continue
      material.hovered.value = false
    }

    // ========================================================
    // block opacity
    for (const blockEntity of this.opacityBlocks.addedOrChanged) {
      if (!blockEntity.alive) continue
      const block = blockEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      let opacity = 1
      if (blockEntity.has(Opacity)) {
        opacity = blockEntity.read(Opacity).value / 255
      }
      const material = mesh.material as LetterMaterial

      material.opacity = opacity
    }

    for (const blockEntity of this.opacityBlocks.removed) {
      if (!blockEntity.alive || !blockEntity.has(Block)) continue
      const block = blockEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const material = mesh.material as LetterMaterial
      material.opacity = 1
    }

    // ========================================================
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

  private getMaterial<T>(blockEntity: Entity): T | null {
    const mesh = this.resources.scene.getObjectByName(blockEntity.read(Block).id) as Mesh | undefined
    if (!mesh) return null
    return mesh.material as T
  }

  private sortMeshesByRank(): void {
    const meshes = this.resources.scene.children as Mesh[]

    const rankCache = new Map<Mesh, LexoRank>()

    for (const mesh of meshes) {
      const rankStr = mesh.userData.rank
      if (!rankStr) continue
      rankCache.set(mesh, LexoRank.parse(rankStr))
    }

    meshes.sort((a, b) => {
      const rankA = rankCache.get(a)
      const rankB = rankCache.get(b)

      if (!rankA || !rankB) return 0

      return rankA.compareTo(rankB)
    })

    for (let i = 0; i < meshes.length; i++) {
      meshes[i].renderOrder = i
    }
  }

  private getRank(blockEntity: Entity): string {
    const block = blockEntity.read(Block)

    // if there's no connector just use the block's rank
    if (!blockEntity.has(Connector)) {
      return block.rank
    }

    let rank = LexoRank.parse(block.rank)

    // if it has a connector use the highest rank of the connecting blocks
    if (blockEntity.has(Connector)) {
      const connector = blockEntity.read(Connector)

      const { startBlockId, endBlockId } = connector
      for (const blockId of [startBlockId, endBlockId]) {
        if (!blockId) continue

        const blockEntity = binarySearchForId(Block, blockId, this.blocks.current)
        if (!blockEntity) continue

        const otherRank = LexoRank.parse(blockEntity.read(Block).rank).genNext()

        if (otherRank.compareTo(rank) > 0) {
          rank = otherRank
        }
      }
    }

    return rank.toString()
  }
}
