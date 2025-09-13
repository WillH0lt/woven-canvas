import type { Entity } from '@lastolivegames/becsy'
import { and, assign, not, setup } from 'xstate'

import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import {
  Block,
  Camera,
  Locked,
  Persistent,
  Selected,
  SelectionState as SelectionStateComp,
  TransformBox,
} from '../components'
import { getCursorSvg } from '../cursors'
import { distance } from '../helpers'
import type { PointerEvent } from '../types'
import { CursorKind, SelectionState } from '../types'
import { PreCaptureIntersect } from './PreCaptureIntersect'

// Minimum pointer move distance to start dragging
const POINTING_THRESHOLD = 4

export class PreCaptureSelect extends BaseSystem<CoreCommandArgs> {
  private readonly _blocks = this.query(
    (q) => q.with(Block, Persistent).read.using(Locked, TransformBox, Selected).read,
  )

  private readonly cameras = this.query((q) => q.changed.with(Camera).trackWrites)

  private readonly selectionState = this.singleton.write(SelectionStateComp)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(PreCaptureIntersect))
  }

  private readonly selectionMachine = setup({
    types: {
      context: {} as {
        pointingStartClient: [number, number]
        pointingStartWorld: [number, number]
        dragStart: [number, number]
        draggedEntityStart: [number, number]
        draggedEntity: Entity | undefined
        cloneGeneratorSeed: string
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
          if (entity?.has(Persistent)) {
            intersect = entity
            break
          }
        }

        if (!intersect) return false
        return intersect.has(Persistent) && intersect.alive
      },
      draggedEntityIsLocked: ({ context }) => {
        if (!context.draggedEntity) return false
        return context.draggedEntity.has(Locked)
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
          const block = event.intersects[0].read(Block)

          return [block.left, block.top] as [number, number]
        },
      }),
      resetDragged: ({ context }) => {
        if (!context.draggedEntity) return
        this.emitCommand(CoreCommand.DragBlock, context.draggedEntity, {
          left: context.draggedEntityStart[0],
          top: context.draggedEntityStart[1],
        })

        if (context.cloneGeneratorSeed) {
          if (context.draggedEntity.has(TransformBox)) {
            this.emitCommand(CoreCommand.UncloneSelected, context.cloneGeneratorSeed)
          } else {
            this.emitCommand(CoreCommand.UncloneEntities, [context.draggedEntity], context.cloneGeneratorSeed)
          }
        }
      },
      resetContext: assign({
        dragStart: [0, 0],
        pointingStartClient: [0, 0],
        pointingStartWorld: [0, 0],
        draggedEntityStart: [0, 0],
        draggedEntity: undefined,
        cloneGeneratorSeed: '',
      }),
      createSelectionBox: () => {
        this.emitCommand(CoreCommand.AddSelectionBox)
      },
      removeSelectionBox: () => {
        this.emitCommand(CoreCommand.RemoveSelectionBox)
      },
      createCheckpoint: () => {
        this.emitCommand(CoreCommand.CreateCheckpoint)
      },
      updateDragged: assign({
        cloneGeneratorSeed: ({ context, event }) => {
          if (!context.draggedEntity) return ''

          let left = context.draggedEntityStart[0] + event.worldPosition[0] - context.dragStart[0]
          let top = context.draggedEntityStart[1] + event.worldPosition[1] - context.dragStart[1]

          const draggingPersistent = context.draggedEntity.has(Persistent) || context.draggedEntity.has(TransformBox)

          if (event.shiftDown && draggingPersistent) {
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

          this.emitCommand(CoreCommand.DragBlock, context.draggedEntity, {
            left,
            top,
          })

          // if alt is down then clone the entity if it hasn't already been cloned
          let cloneGeneratorSeed = context.cloneGeneratorSeed
          if (event.altDown && draggingPersistent && !cloneGeneratorSeed) {
            const block = context.draggedEntity.read(Block)

            const dx = context.draggedEntityStart[0] - block.left
            const dy = context.draggedEntityStart[1] - block.top

            cloneGeneratorSeed = crypto.randomUUID().slice(0, 8)

            if (context.draggedEntity.has(TransformBox)) {
              this.emitCommand(CoreCommand.CloneSelected, [dx, dy], cloneGeneratorSeed)
            } else {
              this.emitCommand(CoreCommand.CloneEntities, [context.draggedEntity], [dx, dy], cloneGeneratorSeed)
            }
          } else if (!event.altDown && cloneGeneratorSeed) {
            // if alt was released then unclone the entity
            if (context.draggedEntity.has(TransformBox)) {
              this.emitCommand(CoreCommand.UncloneSelected, cloneGeneratorSeed)
            } else {
              this.emitCommand(CoreCommand.UncloneEntities, [context.draggedEntity], cloneGeneratorSeed)
            }
            cloneGeneratorSeed = ''
          }

          return cloneGeneratorSeed
        },
      }),
      resizeSelectionBox: ({ context, event }) => {
        this.emitCommand(
          CoreCommand.UpdateSelectionBox,
          {
            left: Math.min(context.pointingStartWorld[0], event.worldPosition[0]),
            top: Math.min(context.pointingStartWorld[1], event.worldPosition[1]),
            width: Math.abs(context.pointingStartWorld[0] - event.worldPosition[0]),
            height: Math.abs(context.pointingStartWorld[1] - event.worldPosition[1]),
          },
          { deselectOthers: !event.shiftDown },
        )
      },
      selectIntersect: ({ event }) => {
        let intersect: Entity | undefined
        for (const entity of event.intersects) {
          if (entity?.has(Persistent)) {
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
        if (!context.draggedEntity.has(Persistent)) return
        this.emitCommand(CoreCommand.SelectBlock, context.draggedEntity, { deselectOthers: true })
      },
      deselectAllIfShiftNotDown: ({ event }) => {
        if (event.shiftDown) return
        this.emitCommand(CoreCommand.DeselectAll)
      },
      deselectAllIfDraggedNotSelected: ({ context }) => {
        if (!context.draggedEntity) return
        if (context.draggedEntity.has(Selected)) return
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
      cloneGeneratorSeed: '',
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
        entry: ['setDragStart', 'setDragCursor', 'deselectAllIfDraggedNotSelected'],
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
