import type { Vec2 } from '@woven-canvas/math'
import { Synced } from '@woven-ecs/canvas-store'
import { addComponent, type Context, type EntityId, removeEntity } from '@woven-ecs/core'
import { defineCommand, on } from '../../command'
import { AddShapeBlock, CompleteShapeBlock, DrawShapeBlock, PlaceShapeBlock, RemoveShapeBlock } from '../../commands'
import { Block } from '../../components/Block'
import { Shape } from '../../components/Shape'
import { Text } from '../../components/Text'
import { VerticalAlign } from '../../components/VerticalAlign'
import { defineEditorSystem } from '../../EditorSystem'
import { Grid } from '../../singletons/Grid'
import { RankBounds } from '../../singletons/RankBounds'
import { TextAlignment, VerticalAlignment } from '../../types'

/** Default shape size in world units (for click-to-place) */
const DEFAULT_SHAPE_SIZE = 200

/**
 * Command to select a block.
 * Defined here with the same name as in plugin-selection so the command system routes it there.
 */
const SelectBlock = defineCommand<{
  entityId: EntityId
  deselectOthers?: boolean
}>('select-block')

/**
 * Update shape draw system - handles shape commands.
 *
 * Processes:
 * - AddShapeBlock: Create new shape entity at start position
 * - DrawShapeBlock: Update shape geometry as user drags
 * - RemoveShapeBlock: Delete shape entity
 * - CompleteShapeBlock: Finalize and select shape
 * - PlaceShapeBlock: Place default-sized shape on click
 */
export const updateShapeDrawSystem = defineEditorSystem({ phase: 'update' }, (ctx: Context) => {
  on(ctx, AddShapeBlock, (ctx, { entityId, position }) => {
    addShape(ctx, entityId, position)
  })

  on(ctx, DrawShapeBlock, (ctx, { entityId, start, end }) => {
    drawShape(ctx, entityId, start, end)
  })

  on(ctx, RemoveShapeBlock, (ctx, { entityId }) => {
    removeEntity(ctx, entityId)
  })

  on(ctx, CompleteShapeBlock, (ctx, { entityId }) => {
    completeShape(ctx, entityId)
  })

  on(ctx, PlaceShapeBlock, (ctx, { entityId, position }) => {
    placeShape(ctx, entityId, position)
  })
})

/**
 * Create a new shape entity at the given position.
 */
function addShape(ctx: Context, entityId: EntityId, position: Vec2): void {
  const snappedPos: Vec2 = [position[0], position[1]]
  Grid.snapPosition(ctx, snappedPos)

  addComponent(ctx, entityId, Block, {
    tag: 'shape',
    rank: RankBounds.genNext(ctx),
    position: [snappedPos[0], snappedPos[1]],
    size: [1, 1],
  })

  addComponent(ctx, entityId, Synced, {
    id: crypto.randomUUID(),
  })

  addComponent(ctx, entityId, Shape)
  addComponent(ctx, entityId, Text, { defaultAlignment: TextAlignment.Center })
  addComponent(ctx, entityId, VerticalAlign, { value: VerticalAlignment.Center })
}

/**
 * Update shape geometry based on start and end positions.
 *
 * The shape is a bounding box defined by two corners:
 * - start: the anchor corner (where the user pressed down)
 * - end: the current cursor position
 *
 * Position is the top-left corner, size is the absolute difference.
 */
function drawShape(ctx: Context, entityId: EntityId, start: Vec2, end: Vec2): void {
  const s: Vec2 = [start[0], start[1]]
  const e: Vec2 = [end[0], end[1]]
  Grid.snapPosition(ctx, s)
  Grid.snapPosition(ctx, e)

  const left = Math.min(s[0], e[0])
  const top = Math.min(s[1], e[1])
  const width = Math.abs(e[0] - s[0])
  const height = Math.abs(e[1] - s[1])

  const block = Block.write(ctx, entityId)
  block.position = [left, top]
  block.size = [Math.max(width, 1), Math.max(height, 1)]
}

/**
 * Place a default-sized shape at the given position (simple click).
 */
function placeShape(ctx: Context, entityId: EntityId, position: Vec2): void {
  const snappedPos: Vec2 = [position[0], position[1]]
  Grid.snapPosition(ctx, snappedPos)

  addComponent(ctx, entityId, Block, {
    tag: 'shape',
    rank: RankBounds.genNext(ctx),
    position: [snappedPos[0] - DEFAULT_SHAPE_SIZE / 2, snappedPos[1] - DEFAULT_SHAPE_SIZE / 2],
    size: [DEFAULT_SHAPE_SIZE, DEFAULT_SHAPE_SIZE],
  })

  addComponent(ctx, entityId, Synced, {
    id: crypto.randomUUID(),
  })

  addComponent(ctx, entityId, Shape)
  addComponent(ctx, entityId, Text, { defaultAlignment: TextAlignment.Center })
  addComponent(ctx, entityId, VerticalAlign, { value: VerticalAlignment.Center })

  SelectBlock.spawn(ctx, { entityId, deselectOthers: true })
}

/**
 * Complete shape drawing - select it if big enough, otherwise remove.
 */
function completeShape(ctx: Context, entityId: EntityId): void {
  const block = Block.read(ctx, entityId)
  if (block.size[0] <= 1 && block.size[1] <= 1) {
    removeEntity(ctx, entityId)
    return
  }

  SelectBlock.spawn(ctx, { entityId, deselectOthers: true })
}
