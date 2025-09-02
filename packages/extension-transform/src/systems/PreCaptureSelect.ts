import { BaseSystem, CoreCommand, type CoreCommandArgs, type PointerEvent } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import { distance } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'
import { and, assign, not, setup } from 'xstate'

import * as transformComps from '../components'
import { getCursorSvg } from '../cursors'
import { CursorKind, SelectionState, TransformCommand, type TransformCommandArgs } from '../types'

// Minimum pointer move distance to start dragging
const POINTING_THRESHOLD = 4

export class PreCaptureSelect extends BaseSystem<TransformCommandArgs & CoreCommandArgs> {
  private readonly _blocks = this.query(
    (q) => q.with(comps.Block, comps.Persistent).read.using(transformComps.Locked, transformComps.TransformBox).read,
  )

  private readonly selectionState = this.singleton.write(transformComps.SelectionState)

  private readonly selectionMachine = setup({
    types: {
      context: {} as {
        pointingStartClient: [number, number]
        pointingStartWorld: [number, number]
        dragStart: [number, number]
        draggedEntityStart: [number, number]
        draggedEntity: Entity | undefined
      },
      events: {} as PointerEvent,
    },
    guards: {
      isThresholdReached: ({ context, event }) => {
        const dist = distance(context.pointingStartClient, event.clientPosition)
        return dist >= POINTING_THRESHOLD
      },
      isOverBlock: ({ event }) => {
        if (event.intersects[0] === undefined) return false
        return event.intersects[0].alive
      },
      isOverPersistentBlock: ({ event }) => {
        let intersect: Entity | undefined
        for (const entity of event.intersects) {
          if (entity?.has(comps.Persistent)) {
            intersect = entity
            break
          }
        }

        if (!intersect) return false
        return intersect.has(comps.Persistent) && intersect.alive
      },
      draggedEntityIsLocked: ({ context }) => {
        if (!context.draggedEntity) return false
        return context.draggedEntity.has(transformComps.Locked)
      },
    },
    actions: {
      setPointingStart: assign({
        pointingStartClient: ({ event }) => event.clientPosition,
        pointingStartWorld: ({ event }) => event.worldPosition,
      }),
      setDragStart: assign({
        dragStart: ({ event }) => event.worldPosition,
      }),
      setDragCursor: () => {
        this.emitCommand(CoreCommand.SetCursor, {
          contextSvg: getCursorSvg(CursorKind.Drag, 0),
        })
      },
      unsetDragCursor: () => {
        this.emitCommand(CoreCommand.SetCursor, {
          contextSvg: '',
        })
      },
      setDraggedEntity: assign({
        draggedEntity: ({ event }) => event.intersects[0],
        draggedEntityStart: ({ event }): [number, number] => {
          if (!event.intersects[0]) return [0, 0]
          const block = event.intersects[0].read(comps.Block)
          return [block.left, block.top] as [number, number]
        },
      }),
      resetDragged: ({ context }) => {
        if (!context.draggedEntity) return
        this.emitCommand(TransformCommand.DragBlock, context.draggedEntity, {
          left: context.draggedEntityStart[0],
          top: context.draggedEntityStart[1],
        })
      },
      resetContext: assign({
        dragStart: [0, 0],
        pointingStartClient: [0, 0],
        pointingStartWorld: [0, 0],
        draggedEntityStart: [0, 0],
        draggedEntity: undefined,
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
        if (!context.draggedEntity) return

        let left = context.draggedEntityStart[0] + event.worldPosition[0] - context.dragStart[0]
        let top = context.draggedEntityStart[1] + event.worldPosition[1] - context.dragStart[1]

        if (
          event.shiftDown &&
          (context.draggedEntity.has(comps.Persistent) || context.draggedEntity.has(transformComps.TransformBox))
        ) {
          // if shift is down then limit the movement to the x-axis or y-axis
          // this only applies when dragging persistent blocks or transform boxes
          // (handles need to manage their own logic for this)
          const dx = Math.abs(event.worldPosition[0] - context.dragStart[0])
          const dy = Math.abs(event.worldPosition[1] - context.dragStart[1])
          if (dx > dy) {
            top = context.draggedEntityStart[1]
          } else {
            left = context.draggedEntityStart[0]
          }
        }

        this.emitCommand(TransformCommand.DragBlock, context.draggedEntity, {
          left,
          top,
        })
      },
      resizeSelectionBox: ({ context, event }) => {
        this.emitCommand(TransformCommand.UpdateSelectionBox, {
          left: Math.min(context.pointingStartWorld[0], event.worldPosition[0]),
          top: Math.min(context.pointingStartWorld[1], event.worldPosition[1]),
          width: Math.abs(context.pointingStartWorld[0] - event.worldPosition[0]),
          height: Math.abs(context.pointingStartWorld[1] - event.worldPosition[1]),
        })
      },
      selectIntersect: ({ event }) => {
        let intersect: Entity | undefined
        for (const entity of event.intersects) {
          if (entity?.has(comps.Persistent)) {
            intersect = entity
            break
          }
        }

        if (!intersect) return

        if (event.shiftDown) {
          this.emitCommand(CoreCommand.ToggleSelect, intersect)
        } else {
          this.emitCommand(CoreCommand.SelectBlock, intersect, { deselectOthers: true })
        }
      },
      selectDragged: ({ context }) => {
        if (!context.draggedEntity) return
        if (!context.draggedEntity.has(comps.Persistent)) return
        this.emitCommand(CoreCommand.SelectBlock, context.draggedEntity, { deselectOthers: true })
      },
      deselectAllIfShiftNotDown: ({ event }) => {
        if (event.shiftDown) return
        this.emitCommand(CoreCommand.DeselectAll)
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
      draggedEntity: undefined,
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
              actions: 'deselectAllIfShiftNotDown',
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
          pointerUp: [
            {
              guard: 'isOverPersistentBlock',
              actions: 'selectIntersect',
              target: SelectionState.Idle,
            },
            {
              actions: 'deselectAllIfShiftNotDown',
              target: SelectionState.Idle,
            },
          ],
          cancel: {
            target: SelectionState.Idle,
          },
        },
      },
      [SelectionState.Dragging]: {
        entry: ['setDragStart', 'setDragCursor'],
        exit: ['unsetDragCursor'],
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
    const buttons = this.controls.getButtons('select')
    const events = this.getPointerEvents(buttons)

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
}
