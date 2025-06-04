import { BaseSystem, comps as coreComps } from '@infinitecanvas/core'
import { transition } from 'xstate'

import * as blockComps from '../components'
import { intersectPoint } from '../helpers'
import { type DragEvent, dragMachine } from '../machines/drag'
import { BlockCommand, type BlockCommandArgs } from '../types'

import { DragState } from '../types'

const comps = {
  ...coreComps,
  ...blockComps,
}

export class CaptureDrag extends BaseSystem<BlockCommandArgs> {
  private readonly pointer = this.singleton.read(comps.Pointer)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  private readonly draggableBlocks = this.query((q) => q.current.with(comps.Block, comps.Draggable))

  private readonly dragged = this.query((q) => q.current.with(comps.Block, comps.Dragged))

  public execute(): void {
    // start dragging if pointer down on draggable
    if (this.pointer.downTrigger && !this.pointer.upTrigger) {
      const intersected = intersectPoint(this.pointer.downPosition, this.draggableBlocks.current)

      if (intersected) {
        const block = intersected.read(comps.Block)
        this.emitCommand(BlockCommand.StartDrag, intersected, {
          state: DragState.Pointing,
          blockStart: [block.left, block.top],
          pointerStart: [this.pointer.downPosition[0], this.pointer.downPosition[1]],
        })
      }
    }

    // update dragged parts
    for (const draggedEntity of this.dragged.current) {
      const dragged = draggedEntity.read(comps.Dragged)

      let state = dragMachine.resolveState({
        value: dragged.state,
        context: {
          grabOffset: [dragged.grabOffset[0], dragged.grabOffset[1]],
          pointerStart: [dragged.pointerStart[0], dragged.pointerStart[1]],
          delta: [dragged.delta[0], dragged.delta[1]],
        },
      })

      const events: DragEvent[] = []
      if (this.pointer.upTrigger) {
        events.push({ type: 'pointerUp' })
      }
      if (this.pointer.downTrigger) {
        events.push({ type: 'pointerDown', position: this.pointer.downPosition })
      }
      if (this.pointer.moveTrigger) {
        events.push({ type: 'pointerMove', position: this.pointer.position })
      }
      if (this.keyboard.escapeDownTrigger) {
        events.push({ type: 'cancel' })
      }

      for (const event of events) {
        state = transition(dragMachine, state, event)[0]
      }

      this.emitCommand(BlockCommand.UpdateDrag, draggedEntity, {
        state: state.value,
        ...state.context,
      })
    }
  }
}
