import { BaseSystem, comps as coreComps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import { assign, setup, transition } from 'xstate'
import * as blockComps from '../components'
import { intersectPoint } from '../helpers/intersectPoint'
import { BlockCommand, type BlockCommandArgs, Selection } from '../types'

const comps = {
  ...coreComps,
  ...blockComps,
}

// Minimum pointer move distance to start dragging
const POINTING_THRESHOLD = 4

const distance = (a: [number, number], b: [number, number]): number => {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)
}

interface SelectionState {
  state: Selection
  pointingStart: [number, number]
  dragStart: [number, number]
  draggedEntityStart: [number, number]
  draggedEntity: Entity | null
}

type SelectionEvent =
  | { type: 'pointerDown'; position: [number, number]; blockEntity: Entity | null }
  | { type: 'pointerUp'; position: [number, number]; blockEntity: Entity | null }
  | { type: 'pointerMove'; position: [number, number] }
  | { type: 'cancel' }

export class CaptureSelection extends BaseSystem<BlockCommandArgs> {
  private readonly pointer = this.singleton.read(comps.Pointer)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  private readonly cursor = this.singleton.read(comps.Cursor)

  private readonly selectionState = this.singleton.write(comps.SelectionState)

  private readonly selectableBlocks = this.query((q) => q.current.with(comps.Block, blockComps.Selectable))

  private readonly selectionMachine = setup({
    types: {
      context: {} as Omit<SelectionState, 'state'>,
      events: {} as SelectionEvent,
    },
    guards: {
      isThresholdReached: ({ context, event }) => {
        if (!('position' in event)) return false
        const dist = distance(context.pointingStart, event.position)
        return dist >= POINTING_THRESHOLD
      },
      isOverBlock: ({ event }) => {
        if (!('blockEntity' in event)) return false
        return !!event.blockEntity
      },
    },
    actions: {
      setPointingStart: assign({
        pointingStart: ({ context, event }) => {
          return 'position' in event ? event.position : context.pointingStart
        },
      }),
      setDragStart: assign({
        dragStart: ({ context, event }) => {
          if (!('position' in event)) return context.dragStart
          return event.position
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
      resetContext: assign({
        dragStart: [0, 0],
        pointingStart: [0, 0],
        draggedEntityStart: [0, 0],
        draggedEntity: null,
      }),
      createSelectionBox: () => {
        this.emitCommand(BlockCommand.AddSelectionBox, {
          alpha: 128,
        })
      },
      removeSelectionBox: () => {
        this.emitCommand(BlockCommand.RemoveSelectionBoxes)
      },
      updateDragged: ({ context, event }) => {
        if (!context.draggedEntity || !('position' in event)) return

        this.emitCommand(BlockCommand.UpdateBlock, context.draggedEntity, {
          left: context.draggedEntityStart[0] + event.position[0] - context.dragStart[0],
          top: context.draggedEntityStart[1] + event.position[1] - context.dragStart[1],
        })
      },
      resizeSelectionBox: ({ context, event }) => {
        if (!('position' in event)) return
        this.emitCommand(BlockCommand.UpdateSelectionBox, {
          left: Math.min(context.pointingStart[0], event.position[0]),
          top: Math.min(context.pointingStart[1], event.position[1]),
          width: Math.abs(context.pointingStart[0] - event.position[0]),
          height: Math.abs(context.pointingStart[1] - event.position[1]),
        })
      },
    },
  }).createMachine({
    id: 'selection',
    initial: Selection.Idle,
    context: {
      dragStart: [0, 0],
      pointingStart: [0, 0],
      draggedEntityStart: [0, 0],
      draggedEntity: null,
      selectionBoxEntity: null,
    },
    states: {
      [Selection.Idle]: {
        entry: 'resetContext',
        on: {
          pointerDown: [
            {
              guard: 'isOverBlock',
              target: Selection.Pointing,
            },
            {
              target: Selection.SelectionBoxPointing,
            },
          ],
        },
      },
      [Selection.Pointing]: {
        entry: ['setPointingStart', 'setDraggedEntity'],
        on: {
          pointerMove: [
            {
              guard: 'isThresholdReached',
              target: Selection.Dragging,
            },
          ],
          pointerUp: {
            // actions: 'selectBlock',
            target: Selection.Idle,
          },
          cancel: {
            target: Selection.Idle,
          },
        },
      },
      [Selection.Dragging]: {
        entry: 'setDragStart',
        on: {
          pointerMove: {
            actions: 'updateDragged',
          },
          pointerUp: {
            target: Selection.Idle,
          },
          cancel: {
            target: Selection.Idle,
          },
        },
      },
      [Selection.SelectionBoxPointing]: {
        entry: 'setPointingStart',
        on: {
          pointerMove: [
            {
              guard: 'isThresholdReached',
              target: Selection.SelectionBoxDragging,
            },
          ],
          pointerUp: {
            target: Selection.Idle,
          },
          cancel: {
            target: Selection.Idle,
          },
        },
      },
      [Selection.SelectionBoxDragging]: {
        entry: ['setDragStart', 'createSelectionBox'],
        exit: 'removeSelectionBox',
        on: {
          pointerMove: {
            actions: 'resizeSelectionBox',
          },
          pointerUp: {
            target: Selection.Idle,
          },
          cancel: {
            target: Selection.Idle,
          },
        },
      },
    },
  })

  public execute(): void {
    if (this.cursor.mode === 'selection') {
      const events = this.getSelectionEvents()

      let state = this.selectionMachine.resolveState({
        value: this.selectionState.state,
        context: this.selectionState,
      })

      for (const event of events) {
        const result = transition(this.selectionMachine, state, event)
        state = result[0]

        for (const action of result[1]) {
          if (typeof action.exec === 'function') {
            action.exec(action.info, action.params)
          }
        }
      }

      Object.assign(this.selectionState, state.context)
      this.selectionState.state = state.value
    }
  }

  private getSelectionEvents(): SelectionEvent[] {
    const events = []

    let blockEntity: Entity | null = null
    if (this.pointer.downTrigger || this.pointer.upTrigger) {
      blockEntity = intersectPoint(this.pointer.position, this.selectableBlocks.current)
    }

    if (this.pointer.downTrigger) {
      events.push({
        type: 'pointerDown',
        position: this.pointer.downPosition,
        blockEntity,
      } as SelectionEvent)
    }

    if (this.pointer.upTrigger) {
      events.push({
        type: 'pointerUp',
        position: this.pointer.upPosition,
        blockEntity,
      } as SelectionEvent)
    }

    if (this.pointer.moveTrigger) {
      events.push({
        type: 'pointerMove',
        position: this.pointer.position,
      } as SelectionEvent)
    }

    if (this.keyboard.escapeDownTrigger) {
      events.push({ type: 'cancel' } as SelectionEvent)
    }

    return events
  }
}
