import {
  Asset,
  addComponent,
  Block,
  type Context,
  defineEditorSystem,
  type EntityId,
  Grid,
  Image,
  on,
  RankBounds,
  removeEntity,
  Synced,
  UploadState,
} from '@woven-canvas/core'
import type { Vec2 } from '@woven-canvas/math'
import { selectBlock } from '@woven-canvas/plugin-selection'
import { AddTape, CompleteTape, DrawTape, PlaceTape, RemoveTape } from '../commands'
import { Tape } from '../components'
import { DEFAULT_TAPE_IMAGE, DEFAULT_TAPE_LENGTH, DEFAULT_TAPE_THICKNESS } from '../constants'

/**
 * Update tape draw system - handles tape commands.
 *
 * Processes:
 * - AddTape: Create new tape entity at start position
 * - DrawTape: Update tape geometry as user drags
 * - RemoveTape: Delete tape entity
 * - CompleteTape: Finalize and select tape
 */
export const updateTapeDrawSystem = defineEditorSystem({ phase: 'update' }, (ctx: Context) => {
  on(ctx, AddTape, (ctx, { entityId, position }) => {
    addTape(ctx, entityId, position)
  })

  on(ctx, DrawTape, (ctx, { entityId, start, end }) => {
    drawTape(ctx, entityId, start, end)
  })

  on(ctx, RemoveTape, (ctx, { entityId }) => {
    removeEntity(ctx, entityId)
  })

  on(ctx, CompleteTape, (ctx, { entityId }) => {
    completeTape(ctx, entityId)
  })

  on(ctx, PlaceTape, (ctx, { entityId, position }) => {
    placeTape(ctx, entityId, position)
  })
})

/**
 * Create a new tape entity at the given position.
 */
function addTape(ctx: Context, entityId: EntityId, position: Vec2): void {
  // Snap start position to grid
  const snappedPos: Vec2 = [position[0], position[1]]
  Grid.snapPosition(ctx, snappedPos)

  // Create block with minimal initial size (will be updated by drawTape)
  addComponent(ctx, entityId, Block, {
    tag: 'tape',
    rank: RankBounds.genNext(ctx),
    position: [snappedPos[0], snappedPos[1] - DEFAULT_TAPE_THICKNESS / 2],
    size: [1, DEFAULT_TAPE_THICKNESS],
  })

  addComponent(ctx, entityId, Synced, {
    id: crypto.randomUUID(),
  })

  addComponent(ctx, entityId, Tape)

  addComponent(ctx, entityId, Image, {})

  addComponent(ctx, entityId, Asset, {
    identifier: DEFAULT_TAPE_IMAGE,
    uploadState: UploadState.Complete,
  })
}

/**
 * Update tape geometry based on start and end positions.
 *
 * The tape stretches from the start point to the current cursor position.
 * Position is the midpoint, width is the distance, height is the thickness,
 * and rotation is derived from the angle between the two points.
 */
function drawTape(ctx: Context, entityId: EntityId, start: Vec2, end: Vec2): void {
  // Snap both endpoints to grid
  const s: Vec2 = [start[0], start[1]]
  const e: Vec2 = [end[0], end[1]]
  Grid.snapPosition(ctx, s)
  Grid.snapPosition(ctx, e)

  const dx = e[0] - s[0]
  const dy = e[1] - s[1]
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)

  // Midpoint between start and end
  const midX = (s[0] + e[0]) / 2
  const midY = (s[1] + e[1]) / 2

  const block = Block.write(ctx, entityId)
  const tape = Tape.read(ctx, entityId)
  const thickness = tape.thickness

  // Position is top-left corner of the unrotated bounding box centered on midpoint
  block.position = [midX - length / 2, midY - thickness / 2]
  block.size = [Math.max(length, 1), thickness]
  block.rotateZ = angle
}

/**
 * Place a default-sized tape at the given position (simple click).
 */
function placeTape(ctx: Context, entityId: EntityId, position: Vec2): void {
  const snappedPos: Vec2 = [position[0], position[1]]
  Grid.snapPosition(ctx, snappedPos)

  addComponent(ctx, entityId, Block, {
    tag: 'tape',
    rank: RankBounds.genNext(ctx),
    position: [snappedPos[0] - DEFAULT_TAPE_LENGTH / 2, snappedPos[1] - DEFAULT_TAPE_THICKNESS / 2],
    size: [DEFAULT_TAPE_LENGTH, DEFAULT_TAPE_THICKNESS],
  })

  addComponent(ctx, entityId, Synced, {
    id: crypto.randomUUID(),
  })

  addComponent(ctx, entityId, Tape)

  addComponent(ctx, entityId, Image, {})

  addComponent(ctx, entityId, Asset, {
    identifier: DEFAULT_TAPE_IMAGE,
    uploadState: UploadState.Complete,
  })

  selectBlock(ctx, entityId)
}

/**
 * Complete tape drawing - select it.
 */
function completeTape(ctx: Context, entityId: EntityId): void {
  // Check the tape has meaningful size
  const block = Block.read(ctx, entityId)
  if (block.size[0] <= 1) {
    // Too small - remove it
    removeEntity(ctx, entityId)
    return
  }

  selectBlock(ctx, entityId)
}
