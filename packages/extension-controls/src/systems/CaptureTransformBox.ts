import { BaseSystem, type PointerEvent, comps } from '@infinitecanvas/core'
import { TransformBox } from '../components/TransformBox'
import { ControlCommand, type ControlCommandArgs } from '../types'
import { CapturePan } from './CapturePan'
import { CaptureSelect } from './CaptureSelect'

type SelectionEvent =
  | PointerEvent
  | {
      type: 'selectionChanged'
    }

export class CaptureTransformBox extends BaseSystem<ControlCommandArgs> {
  private readonly pointers = this.query((q) => q.added.removed.current.changed.with(comps.Pointer).trackWrites)

  private readonly selectedBlocks = this.query((q) => q.added.removed.current.with(comps.Block, comps.Selected))

  private readonly transformBoxes = this.query((q) => q.current.with(TransformBox).write)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureSelect, CapturePan))
  }

  public execute(): void {
    const events = this.getSelectionEvents()

    const selectedCount = this.selectedBlocks.current.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    ).length

    // const transformBox = this.transformBoxes.current.find((e) => e.read(comps.Block).createdBy === this.resources.uid)

    if (events.find((e) => e.type === 'selectionChanged')) {
      if (selectedCount === 0) {
        this.emitCommand(ControlCommand.RemoveTransformBox)
      } else {
        this.emitAddOrUpdateTransformBox()
      }
    } else if (selectedCount > 0) {
      if (events.find((e) => e.type === 'pointerDown')) {
        this.emitCommand(ControlCommand.HideTransformBox)
      } else if (events.find((e) => e.type === 'pointerUp')) {
        this.emitAddOrUpdateTransformBox()
      }
    }
  }

  private getSelectionEvents(): SelectionEvent[] {
    const events: SelectionEvent[] = []

    const addedCount = this.selectedBlocks.added.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    ).length
    if (addedCount > 0) {
      events.push({ type: 'selectionChanged' })
    } else {
      if (this.selectedBlocks.removed.length) {
        this.accessRecentlyDeletedData()
      }
      const removedCount = this.selectedBlocks.removed.filter(
        (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
      ).length

      if (removedCount > 0) {
        events.push({ type: 'selectionChanged' })
      }
    }

    const button = this.tool.getButton('select')
    if (button !== null) {
      const e = this.getPointerEvents(this.pointers, this.camera, this.intersect, {
        button,
      })
      events.push(...e)
    }

    return events
  }

  private emitAddOrUpdateTransformBox(): void {
    const transformBox = this.transformBoxes.current.find((e) => e.read(comps.Block).createdBy === this.resources.uid)

    if (transformBox) {
      this.emitCommand(ControlCommand.UpdateTransformBox)
    } else {
      this.emitCommand(ControlCommand.AddTransformBox)
    }
  }
}
