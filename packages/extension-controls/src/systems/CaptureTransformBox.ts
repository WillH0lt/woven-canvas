import { BaseSystem, PointerButton, type PointerEvent, comps } from '@infinitecanvas/core'
import { ControlCommand, type ControlCommandArgs } from '../types'
import { CaptureDrag } from './CaptureDrag'
import { CaptureSelect } from './CaptureSelect'

export class CaptureTransformBox extends BaseSystem<ControlCommandArgs> {
  private readonly pointers = this.query((q) => q.added.removed.current.changed.with(comps.Pointer).trackWrites)

  private readonly selectedBlocks = this.query((q) => q.added.removed.current.with(comps.Block, comps.Selected))

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureSelect, CaptureDrag))
  }

  public execute(): void {
    if (this.selectedBlocks.added.length || this.selectedBlocks.removed.length) {
      if (this.selectedBlocks.current.length === 0) {
        this.emitCommand(ControlCommand.RemoveTransformBox)
      } else {
        this.emitCommand(ControlCommand.AddOrReplaceTransformBox)
      }
    }

    if (this.selectedBlocks.current.length) {
      const events = this.getSelectionEvents()

      if (events.find((e) => e.type === 'pointerDown')) {
        this.emitCommand(ControlCommand.HideTransformBox)
      } else if (events.find((e) => e.type === 'pointerUp')) {
        this.emitCommand(ControlCommand.AddOrReplaceTransformBox)
      }

      // if (this.pointers.added.length > 0) {
      //   this.emitCommand(ControlCommand.HideTransformBox)
      // } else if (this.pointers.removed.length > 0 && this.pointers.current.length === 0) {
      //   this.emitCommand(ControlCommand.AddOrReplaceTransformBox)
      // }
    }
  }

  private getSelectionEvents(): PointerEvent[] {
    let button: PointerButton | null = null
    if (this.tool.leftMouse === 'select') {
      button = PointerButton.Left
    } else if (this.tool.middleMouse === 'select') {
      button = PointerButton.Middle
    } else if (this.tool.rightMouse === 'select') {
      button = PointerButton.Right
    }

    if (button === null) return []

    const events = this.getPointerEvents(this.pointers, this.camera, this.intersect, {
      button,
    })

    return events
  }
}
