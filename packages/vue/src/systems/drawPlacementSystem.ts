import {
  Block,
  type Context,
  Controls,
  Cursor,
  DeselectAll,
  defineEditorSystem,
  type EntityId,
  findFrameAtPoint,
  Grid,
  getPointerInput,
  type PointerInput,
  removeEntity,
  selectBlock,
} from '@woven-canvas/core'
import { Vec2 } from '@woven-canvas/math'
import { assign, setup } from 'xstate'

import { createBlockFromSnapshot, parseSnapshot } from '../helpers/snapshot'
import { PlacementDrawState, PlacementDrawStateEnum } from '../singletons/PlacementDrawState'

/** Minimum pointer move distance (screen pixels) before transitioning from Pointing to Drawing */
const POINTING_THRESHOLD = 4

/** Minimum block size to keep on complete (blocks smaller than this are removed) */
const MIN_DRAW_SIZE = 1

/** The tool name used for draw-to-create interactions */
const DRAW_TOOL = 'draw'

/**
 * Assign an entity to a frame if it was created inside one.
 */
function assignToFrame(ctx: Context, entityId: EntityId, position: [number, number]): void {
  const frameId = findFrameAtPoint(ctx, position, entityId)
  if (frameId !== null) {
    const currentWorldPos = Block.getWorldPosition(ctx, entityId)
    const block = Block.write(ctx, entityId)
    block.parentId = frameId
    Block.setWorldPosition(ctx, entityId, currentWorldPos)
  }
}

type PlacementDrawContext = {
  activeEntity: EntityId | null
  pointingStartWorld: [number, number]
}

/**
 * Placement draw state machine - handles pointer events for draw-to-create interactions.
 *
 * Flow:
 * - Idle → pointerDown → Pointing (record start position)
 * - Pointing → pointerMove (past threshold) → Drawing (create entity)
 * - Drawing → pointerMove → update block geometry
 * - Drawing → pointerUp → complete (select or remove)
 * - Pointing → pointerUp → place default-sized block
 * - Any → cancel → remove entity
 */
const drawMachine = setup({
  types: {
    context: {} as PlacementDrawContext,
    events: {} as PointerInput,
  },
  guards: {
    isThresholdReached: ({ context, event }) => {
      const worldDist = Vec2.distance(context.pointingStartWorld, event.worldPosition)
      return worldDist * event.cameraZoom >= POINTING_THRESHOLD
    },
  },
  actions: {
    setPointingStart: assign({
      pointingStartWorld: ({ event }): [number, number] => [event.worldPosition[0], event.worldPosition[1]],
    }),

    resetContext: assign({
      pointingStartWorld: (): [number, number] => [0, 0],
      activeEntity: () => null,
    }),

    addEntity: assign({
      activeEntity: ({ context, event }): EntityId => {
        const snapshot = parseSnapshot(Controls.read(event.ctx).heldSnapshot)
        if (!snapshot) return null as unknown as EntityId

        // Create entity at start position with minimal size — draw will resize it
        const drawSnapshot = { ...snapshot, block: { ...snapshot.block, size: [1, 1] as [number, number] } }
        const entityId = createBlockFromSnapshot(event.ctx, drawSnapshot, context.pointingStartWorld)

        // Assign to frame if drawing started inside one
        assignToFrame(event.ctx, entityId, context.pointingStartWorld)

        return entityId
      },
    }),

    drawEntity: ({ context, event }) => {
      if (!context.activeEntity) return
      const s: [number, number] = [context.pointingStartWorld[0], context.pointingStartWorld[1]]
      const e: [number, number] = [event.worldPosition[0], event.worldPosition[1]]
      Grid.snapPosition(event.ctx, s)
      Grid.snapPosition(event.ctx, e)

      const left = Math.min(s[0], e[0])
      const top = Math.min(s[1], e[1])
      const width = Math.max(Math.abs(e[0] - s[0]), 1)
      const height = Math.max(Math.abs(e[1] - s[1]), 1)

      const block = Block.write(event.ctx, context.activeEntity)
      block.size = [width, height]
      // Use setWorldPosition to handle world-to-local conversion for parented blocks
      Block.setWorldPosition(event.ctx, context.activeEntity, [left, top])
    },

    completeEntity: ({ context, event }) => {
      if (!context.activeEntity) return
      const block = Block.read(event.ctx, context.activeEntity)
      if (block.size[0] < MIN_DRAW_SIZE || block.size[1] < MIN_DRAW_SIZE) {
        removeEntity(event.ctx, context.activeEntity)
        return
      }
      selectBlock(event.ctx, context.activeEntity)
    },

    removeEntity: assign({
      activeEntity: ({ context, event }): EntityId | null => {
        if (context.activeEntity) {
          removeEntity(event.ctx, context.activeEntity)
        }
        return null
      },
    }),

    placeEntity: ({ context, event }) => {
      const snapshot = parseSnapshot(Controls.read(event.ctx).heldSnapshot)
      if (!snapshot) return
      const entityId = createBlockFromSnapshot(event.ctx, snapshot, context.pointingStartWorld)
      assignToFrame(event.ctx, entityId, context.pointingStartWorld)
      selectBlock(event.ctx, entityId)
    },

    exitToSelect: ({ event }) => {
      const controls = Controls.write(event.ctx)
      controls.leftMouseTool = 'select'
      controls.activeToolName = 'select'
      controls.heldSnapshot = ''

      const cursor = Cursor.write(event.ctx)
      cursor.cursorKind = 'select'
    },

    deselectAll: ({ event }) => {
      DeselectAll.spawn(event.ctx)
    },
  },
}).createMachine({
  id: 'drawPlacement',
  initial: PlacementDrawStateEnum.Idle,
  context: {
    activeEntity: null,
    pointingStartWorld: [0, 0],
  },
  states: {
    [PlacementDrawStateEnum.Idle]: {
      entry: 'resetContext',
      on: {
        pointerDown: {
          actions: 'deselectAll',
          target: PlacementDrawStateEnum.Pointing,
        },
      },
    },
    [PlacementDrawStateEnum.Pointing]: {
      entry: 'setPointingStart',
      on: {
        pointerMove: {
          guard: 'isThresholdReached',
          target: PlacementDrawStateEnum.Drawing,
        },
        pointerUp: {
          actions: ['placeEntity', 'exitToSelect'],
          target: PlacementDrawStateEnum.Idle,
        },
        cancel: {
          target: PlacementDrawStateEnum.Idle,
        },
      },
    },
    [PlacementDrawStateEnum.Drawing]: {
      entry: 'addEntity',
      on: {
        pointerMove: {
          actions: 'drawEntity',
        },
        pointerUp: {
          actions: ['completeEntity', 'exitToSelect'],
          target: PlacementDrawStateEnum.Idle,
        },
        cancel: {
          actions: 'removeEntity',
          target: PlacementDrawStateEnum.Idle,
        },
      },
    },
  },
})

/**
 * Draw placement system - handles draw-to-create interactions for shapes, frames, etc.
 *
 * Runs when leftMouseTool is 'draw' and Controls.heldSnapshot contains the block snapshot.
 * The snapshot (set by toolbar buttons via draw-snapshot prop) contains all the data needed:
 * block tag, default size, and component initialization data.
 */
export const drawPlacementSystem = defineEditorSystem({ phase: 'capture', priority: 100 }, (ctx: Context) => {
  const controls = Controls.read(ctx)

  if (controls.leftMouseTool !== DRAW_TOOL || !controls.heldSnapshot) return

  const buttons = Controls.getButtons(ctx, DRAW_TOOL)
  if (buttons.length === 0) return

  const events = getPointerInput(ctx, buttons)
  if (events.length === 0) return

  PlacementDrawState.run(ctx, drawMachine, events)
})
