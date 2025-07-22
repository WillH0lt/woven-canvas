import { BaseSystem, CoreCommand, type CoreCommandArgs, type PointerEvent, comps } from '@infinitecanvas/core'
import { distance } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'
import { and, assign, not, setup } from 'xstate'

import * as transformComps from '../components'
import { SelectionState, TransformCommand, type TransformCommandArgs } from '../types'

// Minimum pointer move distance to start dragging
const POINTING_THRESHOLD = 4

export class CaptureSelect extends BaseSystem<TransformCommandArgs & CoreCommandArgs> {
  private readonly pointers = this.query((q) => q.added.removed.changed.current.with(comps.Pointer).read.trackWrites)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  private readonly cursorState = this.singleton.read(comps.CursorState)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly _blocks = this.query(
    (q) => q.with(comps.Block, comps.Persistent).read.using(transformComps.Locked).read,
  )

  private readonly selectionState = this.singleton.write(transformComps.SelectionState)

  private readonly selectionMachine = setup({
    types: {
      context: {} as {
        pointingStartClient: [number, number]
        pointingStartWorld: [number, number]
        dragStart: [number, number]
        draggedEntityStart: [number, number]
        draggedEntity: Entity | null
      },
      events: {} as PointerEvent,
    },
    guards: {
      isThresholdReached: ({ context, event }) => {
        if (!('clientPosition' in event)) return false
        const dist = distance(context.pointingStartClient, event.clientPosition)
        return dist >= POINTING_THRESHOLD
      },
      isOverBlock: ({ event }) => {
        if (!('blockEntity' in event)) return false
        if (event.blockEntity === null) return false

        return event.blockEntity.alive
      },
      draggedEntityIsLocked: ({ context }) => {
        if (!context.draggedEntity) return false
        return context.draggedEntity.has(transformComps.Locked)
      },
    },
    actions: {
      setPointingStart: assign({
        pointingStartClient: ({ context, event }) => {
          return 'clientPosition' in event ? event.clientPosition : context.pointingStartClient
        },
        pointingStartWorld: ({ context, event }) => {
          return 'worldPosition' in event ? event.worldPosition : context.pointingStartWorld
        },
      }),
      setDragStart: assign({
        dragStart: ({ context, event }) => {
          if (!('worldPosition' in event)) return context.dragStart
          return event.worldPosition
        },
      }),
      setDraggedEntity: assign({
        draggedEntity: ({ event }) => {
          return 'blockEntity' in event ? event.blockEntity : null
        },
        draggedEntityStart: ({ context, event }): [number, number] => {
          if (!('blockEntity' in event)) return context.draggedEntityStart
          if (!event.blockEntity) return [0, 0]
          const block = event.blockEntity.read(comps.Block)
          return [block.left, block.top] as [number, number]
        },
      }),
      resetDragged: ({ context }) => {
        if (!context.draggedEntity) return
        this.emitCommand(CoreCommand.UpdateBlock, context.draggedEntity, {
          left: context.draggedEntityStart[0],
          top: context.draggedEntityStart[1],
        })
      },
      resetContext: assign({
        dragStart: [0, 0],
        pointingStartClient: [0, 0],
        pointingStartWorld: [0, 0],
        draggedEntityStart: [0, 0],
        draggedEntity: null,
      }),
      createSelectionBox: () => {
        this.emitCommand(TransformCommand.AddSelectionBox)
      },
      removeSelectionBox: () => {
        this.emitCommand(TransformCommand.RemoveSelectionBox)
      },
      createCheckpoint: () => {
        this.emitCommand(CoreCommand.CreateCheckpoint)
      },
      updateDragged: ({ context, event }) => {
        if (!context.draggedEntity || !('worldPosition' in event)) return

        this.emitCommand(CoreCommand.UpdateBlock, context.draggedEntity, {
          left: context.draggedEntityStart[0] + event.worldPosition[0] - context.dragStart[0],
          top: context.draggedEntityStart[1] + event.worldPosition[1] - context.dragStart[1],
        })
      },
      resizeSelectionBox: ({ context, event }) => {
        if (!('worldPosition' in event)) return
        this.emitCommand(TransformCommand.UpdateSelectionBox, {
          left: Math.min(context.pointingStartWorld[0], event.worldPosition[0]),
          top: Math.min(context.pointingStartWorld[1], event.worldPosition[1]),
          width: Math.abs(context.pointingStartWorld[0] - event.worldPosition[0]),
          height: Math.abs(context.pointingStartWorld[1] - event.worldPosition[1]),
        })
      },
      selectDragged: ({ context }) => {
        if (!context.draggedEntity) return
        if (!context.draggedEntity.has(comps.Persistent)) return
        this.emitCommand(TransformCommand.SelectBlock, context.draggedEntity, { options: { deselectOthers: true } })
      },
      deselectAll: () => {
        this.emitCommand(TransformCommand.DeselectAll)
      },
    },
  }).createMachine({
    id: 'selection',
    initial: SelectionState.Idle,
    context: {
      dragStart: [0, 0],
      pointingStartClient: [0, 0],
      pointingStartWorld: [0, 0],
      draggedEntityStart: [0, 0],
      draggedEntity: null,
    },
    states: {
      [SelectionState.Idle]: {
        entry: 'resetContext',
        on: {
          pointerDown: [
            {
              guard: 'isOverBlock',
              target: SelectionState.Pointing,
            },
            {
              actions: 'deselectAll',
              target: SelectionState.SelectionBoxPointing,
            },
          ],
        },
      },
      [SelectionState.Pointing]: {
        entry: ['setPointingStart', 'setDraggedEntity'],
        on: {
          pointerMove: {
            guard: and(['isThresholdReached', not('draggedEntityIsLocked')]),
            target: SelectionState.Dragging,
          },
          pointerUp: {
            actions: 'selectDragged',
            target: SelectionState.Idle,
          },
          cancel: {
            target: SelectionState.Idle,
          },
        },
      },
      [SelectionState.Dragging]: {
        entry: 'setDragStart',
        on: {
          pointerMove: {
            actions: 'updateDragged',
          },
          pointerUp: {
            actions: ['selectDragged', 'createCheckpoint'],
            target: SelectionState.Idle,
          },
          cancel: {
            actions: 'resetDragged',
            target: SelectionState.Idle,
          },
        },
      },
      [SelectionState.SelectionBoxPointing]: {
        entry: 'setPointingStart',
        on: {
          pointerMove: {
            guard: 'isThresholdReached',
            target: SelectionState.SelectionBoxDragging,
          },
          pointerUp: {
            target: SelectionState.Idle,
          },
          cancel: {
            target: SelectionState.Idle,
          },
        },
      },
      [SelectionState.SelectionBoxDragging]: {
        entry: ['setDragStart', 'createSelectionBox'],
        exit: 'removeSelectionBox',
        on: {
          pointerMove: {
            actions: 'resizeSelectionBox',
          },
          pointerUp: {
            target: SelectionState.Idle,
          },
          cancel: {
            target: SelectionState.Idle,
          },
        },
      },
    },
  })

  public execute(): void {
    const events = this.getSelectionEvents()

    if (events.length === 0) return

    const { value, context } = this.runMachine<SelectionState>(
      this.selectionMachine,
      this.selectionState.state,
      this.selectionState,
      events,
    )

    Object.assign(this.selectionState, context)
    this.selectionState.state = value
  }

  private getSelectionEvents(): PointerEvent[] {
    const button = this.tool.getButton('select')

    if (button === null) return []

    const events = this.getPointerEvents(this.pointers, this.camera, this.intersect, {
      button,
    })

    if (this.keyboard.escapeDownTrigger) {
      events.push({ type: 'cancel' } as PointerEvent)
    }

    return events
  }
}
