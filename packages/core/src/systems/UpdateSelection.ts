import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import { Block, Persistent, Selected, SelectionBox, allHitGeometriesArray } from '../components'
import { SELECTION_BOX_RANK } from '../constants'
import { computeAabb, uuidToNumber } from '../helpers'
import { fastIntersectAabb } from '../helpers'
import { UpdateBlocks } from './UpdateBlocks'
import { UpdateCamera } from './UpdateCamera'

export class UpdateSelection extends BaseSystem<CoreCommandArgs> {
  private readonly blocks = this.query(
    (q) =>
      q.current
        .with(Block, Persistent)
        .write.orderBy((e) => uuidToNumber(e.read(Block).id))
        .using(...allHitGeometriesArray).read,
  )

  private readonly selectedBlocks = this.query((q) => q.current.with(Block, Selected).write)

  private readonly selectionBoxes = this.query((q) => q.current.with(Block, SelectionBox).write)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateBlocks, UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.AddSelectionBox, this.addSelectionBox.bind(this))
    this.addCommandListener(CoreCommand.UpdateSelectionBox, this.updateSelectionBox.bind(this))
    this.addCommandListener(CoreCommand.RemoveSelectionBox, this.removeSelectionBox.bind(this))
  }

  private addSelectionBox(): void {
    const id = crypto.randomUUID()
    this.createEntity(
      Block,
      {
        id,
        tag: this.resources.tags.selectionBox,
        rank: SELECTION_BOX_RANK,
      },
      SelectionBox,
    )
  }

  private updateSelectionBox(
    blockPartial: { left: number; top: number; width: number; height: number },
    options: { deselectOthers?: boolean } = {},
  ): void {
    if (this.selectionBoxes.current.length === 0) {
      console.warn(`Can't update selection box. Selection box not found for user ${this.resources.uid}`)
      return
    }
    // TODO somehow reference which selection box to update (ie by uid)
    const selectionBoxEntity = this.selectionBoxes.current[0]

    const block = selectionBoxEntity.write(Block)
    Object.assign(block, blockPartial)

    // if (meta.uid !== this.resources.uid) return

    // const aabb = { left: block.left, top: block.top, right: block.left + block.width, bottom: block.bottom }
    const aabb = computeAabb(selectionBoxEntity)
    const intersectedEntities = fastIntersectAabb(aabb, this.blocks.current)
    if (options?.deselectOthers) {
      for (const selectedEntity of this.selectedBlocks.current) {
        const shouldDeselect = !intersectedEntities.some((entity) => entity.isSame(selectedEntity))
        if (shouldDeselect && selectedEntity.has(Selected)) {
          selectedEntity.remove(Selected)
        }
      }
    }

    for (const entity of intersectedEntities) {
      if (!entity.has(Selected)) {
        entity.add(Selected, {
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
}
