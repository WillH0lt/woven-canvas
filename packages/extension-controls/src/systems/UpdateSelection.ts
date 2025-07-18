import {
  BaseSystem,
  BlockCommand,
  type BlockCommandArgs,
  type BlockModel,
  type CommandMeta,
  comps,
} from '@infinitecanvas/core'
import { UuidGenerator, binarySearchForId, computeAabb, uuidToNumber } from '@infinitecanvas/core/helpers'

import { SelectionBox } from '../components'
import { SELECTION_BOX_RANK } from '../constants'
import { intersectAabb } from '../helpers'
import { ControlCommand, type ControlCommandArgs, type SelectBlockOptions } from '../types'

export class UpdateSelection extends BaseSystem<ControlCommandArgs & BlockCommandArgs> {
  private readonly blocks = this.query(
    (q) =>
      q.current
        .with(comps.Block, comps.Persistent)
        .write.orderBy((e) => uuidToNumber(e.read(comps.Block).id))
        .using(comps.Aabb).read,
  )

  private readonly selectedBlocks = this.query((q) => q.current.with(comps.Block, comps.Selected).write)

  private readonly selectionBoxes = this.query((q) => q.current.with(comps.Block, comps.Shape, SelectionBox).write)

  public initialize(): void {
    this.addCommandListener(ControlCommand.AddSelectionBox, this.addSelectionBox.bind(this))
    this.addCommandListener(ControlCommand.UpdateSelectionBox, this.updateSelectionBox.bind(this))
    this.addCommandListener(ControlCommand.RemoveSelectionBox, this.removeSelectionBox.bind(this))

    this.addCommandListener(ControlCommand.SelectBlock, this.selectBlock.bind(this))
    this.addCommandListener(ControlCommand.DeselectBlock, this.deselectBlock.bind(this))
    this.addCommandListener(ControlCommand.DeselectAll, this.deselectAll.bind(this))

    this.addCommandListener(BlockCommand.Undo, this.deselectAll.bind(this))
    this.addCommandListener(BlockCommand.Redo, this.deselectAll.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private addSelectionBox(meta: CommandMeta): void {
    const uuid = new UuidGenerator(meta.seed)
    const id = uuid.next()
    this.createEntity(
      comps.Block,
      {
        id,
        rank: SELECTION_BOX_RANK,
      },
      comps.Shape,
      {
        alpha: 128,
      },
      SelectionBox,
    )
  }

  private updateSelectionBox(meta: CommandMeta, blockPartial: Partial<BlockModel>): void {
    if (this.selectionBoxes.current.length === 0) {
      console.warn(`Can't update selection box. Selection box not found for user ${meta.uid}`)
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
          selectedBy: meta.uid,
        })
      }
    }
  }

  private removeSelectionBox(meta: CommandMeta): void {
    if (this.selectionBoxes.current.length === 0) {
      console.warn(`Can't remove selection box. Selection box not found for user ${meta.uid}`)
      return
    }

    // TODO somehow reference which selection box to remove (ie by uid)
    const selectionBoxEntity = this.selectionBoxes.current[0]

    this.deleteEntity(selectionBoxEntity)
  }

  private deselectAll(meta: CommandMeta): void {
    for (const blockEntity of this.selectedBlocks.current) {
      if (blockEntity.has(comps.Selected) && blockEntity.read(comps.Selected).selectedBy === meta.uid) {
        blockEntity.remove(comps.Selected)
      }
    }
  }

  private selectBlock(meta: CommandMeta, { id, options }: { id: string; options?: SelectBlockOptions }): void {
    if (options?.deselectOthers) {
      this.deselectAll(meta)
    }

    const blockEntity = binarySearchForId(comps.Block, id, this.blocks.current)
    if (!blockEntity) {
      console.warn(`Block with id ${id} not found`)
      return
    }

    if (blockEntity.has(comps.Selected)) return

    blockEntity.add(comps.Selected, {
      selectedBy: meta.uid,
    })
  }

  private deselectBlock(meta: CommandMeta, { id }: { id: string }): void {
    const blockEntity = binarySearchForId(comps.Block, id, this.blocks.current)
    if (!blockEntity) {
      console.warn(`Block with id ${id} not found`)
      return
    }

    if (!blockEntity.has(comps.Selected)) return
    if (blockEntity.read(comps.Selected).selectedBy !== meta.uid) return

    blockEntity.remove(comps.Selected)
  }
}
