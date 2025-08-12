import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import { computeAabb, uuidToNumber } from '@infinitecanvas/core/helpers'

import type { Entity } from '@lastolivegames/becsy'
import { SelectionBox } from '../components'
import { SELECTION_BOX_RANK } from '../constants'
import { intersectAabb } from '../helpers'
import { type SelectBlockOptions, TransformCommand, type TransformCommandArgs, type TransformResources } from '../types'

export class UpdateSelection extends BaseSystem<TransformCommandArgs & CoreCommandArgs> {
  protected readonly resources!: TransformResources

  private readonly blocks = this.query(
    (q) =>
      q.current
        .with(comps.Block, comps.Persistent)
        .write.orderBy((e) => uuidToNumber(e.read(comps.Block).id))
        .using(comps.Aabb, comps.HitGeometries, comps.HitCapsule).read,
  )

  private readonly selectedBlocks = this.query((q) => q.current.with(comps.Block, comps.Selected).write)

  private readonly selectionBoxes = this.query((q) => q.current.with(comps.Block, SelectionBox).write)

  public initialize(): void {
    this.addCommandListener(TransformCommand.AddSelectionBox, this.addSelectionBox.bind(this))
    this.addCommandListener(TransformCommand.UpdateSelectionBox, this.updateSelectionBox.bind(this))
    this.addCommandListener(TransformCommand.RemoveSelectionBox, this.removeSelectionBox.bind(this))

    this.addCommandListener(TransformCommand.SelectBlock, this.selectBlock.bind(this))
    this.addCommandListener(TransformCommand.DeselectBlock, this.deselectBlock.bind(this))
    this.addCommandListener(TransformCommand.DeselectAll, this.deselectAll.bind(this))

    this.addCommandListener(CoreCommand.Undo, this.deselectAll.bind(this))
    this.addCommandListener(CoreCommand.Redo, this.deselectAll.bind(this))
  }

  private addSelectionBox(): void {
    const id = crypto.randomUUID()
    this.createEntity(
      comps.Block,
      {
        id,
        tag: this.resources.selectionBoxTag,
        rank: SELECTION_BOX_RANK,
      },
      SelectionBox,
    )
  }

  private updateSelectionBox(blockPartial: Partial<comps.Block>): void {
    if (this.selectionBoxes.current.length === 0) {
      console.warn(`Can't update selection box. Selection box not found for user ${this.resources.uid}`)
      return
    }
    // TODO somehow reference which selection box to update (ie by uid)
    const selectionBoxEntity = this.selectionBoxes.current[0]

    const block = selectionBoxEntity.write(comps.Block)
    Object.assign(block, blockPartial)

    // if (meta.uid !== this.resources.uid) return

    // const aabb = { left: block.left, top: block.top, right: block.left + block.width, bottom: block.bottom }
    const aabb = computeAabb(selectionBoxEntity)
    const intersectedEntities = intersectAabb(aabb, this.blocks.current)
    for (const selectedEntity of this.selectedBlocks.current) {
      const shouldDeselect = !intersectedEntities.some((entity) => entity.isSame(selectedEntity))
      if (shouldDeselect) {
        if (selectedEntity.has(comps.Selected)) selectedEntity.remove(comps.Selected)
      }
    }

    for (const entity of intersectedEntities) {
      if (!entity.has(comps.Selected)) {
        entity.add(comps.Selected, {
          selectedBy: this.resources.uid,
        })
      }
    }
  }

  private removeSelectionBox(): void {
    if (this.selectionBoxes.current.length === 0) {
      console.warn(`Can't remove selection box. Selection box not found for user ${this.resources.uid}`)
      return
    }

    // TODO somehow reference which selection box to remove (ie by uid)
    const selectionBoxEntity = this.selectionBoxes.current[0]

    this.deleteEntity(selectionBoxEntity)
  }

  private deselectAll(): void {
    for (const blockEntity of this.selectedBlocks.current) {
      if (blockEntity.has(comps.Selected) && blockEntity.read(comps.Selected).selectedBy === this.resources.uid) {
        blockEntity.remove(comps.Selected)
      }
    }
  }

  private selectBlock(blockEntity: Entity, { options }: { options?: SelectBlockOptions }): void {
    if (options?.deselectOthers) {
      this.deselectAll()
    }

    if (blockEntity.has(comps.Selected)) return

    blockEntity.add(comps.Selected, {
      selectedBy: this.resources.uid,
    })
  }

  private deselectBlock(blockEntity: Entity): void {
    if (!blockEntity.has(comps.Selected)) return
    if (blockEntity.read(comps.Selected).selectedBy !== this.resources.uid) return

    blockEntity.remove(comps.Selected)
  }
}
