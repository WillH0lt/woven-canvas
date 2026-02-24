import {
  addComponent,
  Block,
  Camera,
  type Context,
  createEntity,
  defineEditorSystem,
  defineQuery,
  Edited,
  type EntityId,
  getBackrefs,
  getBlockDef,
  getBlockResizeMode,
  hasComponent,
  isAlive,
  Opacity,
  on,
  ResizeMode,
  removeComponent,
  removeEntity,
  ScaleWithZoom,
  Text,
} from '@woven-canvas/core'
// Note: createEntity is still used for creating transform handles
import { Rect, Vec2 } from '@woven-canvas/math'
import {
  AddTransformBox,
  EndTransformBoxEdit,
  HideTransformBox,
  RemoveTransformBox,
  ShowTransformBox,
  StartTransformBoxEdit,
  UpdateTransformBox,
} from '../../commands'
import { DragStart, Selected, TransformBox, TransformHandle } from '../../components'
import { CursorKind } from '../../cursors'
import { SelectionStateSingleton } from '../../singletons'
import { SelectionState, TransformHandleKind } from '../../types'

// Query for selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected))

const editedBlocksQuery = defineQuery((q) => q.with(Block, Edited))

// Transform box z-order rank
const TRANSFORM_BOX_RANK = 'a'
const TRANSFORM_HANDLE_ROTATE_RANK = 'b'
const TRANSFORM_HANDLE_EDGE_RANK = 'c'
const TRANSFORM_HANDLE_CORNER_RANK = 'd'

/**
 * Transform box update system - manages transform box and handles.
 *
 * Runs late in the update phase (priority: -100) so queries see selection changes made by
 * other update systems in the same frame.
 */
export const transformBoxSystem = defineEditorSystem({ phase: 'update', priority: -100 }, (ctx: Context) => {
  // RemoveTransformBox must be first to avoid stale references
  on(ctx, RemoveTransformBox, (ctx, { transformBoxId }) => {
    removeTransformBox(ctx, transformBoxId)
  })
  on(ctx, AddTransformBox, (ctx, { transformBoxId, skipHandles }) => {
    addTransformBox(ctx, transformBoxId, skipHandles)
  })
  on(ctx, UpdateTransformBox, (ctx, { transformBoxId }) => {
    updateTransformBox(ctx, transformBoxId)
  })
  on(ctx, HideTransformBox, (ctx, { transformBoxId }) => {
    hideTransformBox(ctx, transformBoxId)
  })
  on(ctx, ShowTransformBox, (ctx, { transformBoxId }) => {
    showTransformBox(ctx, transformBoxId)
  })
  on(ctx, StartTransformBoxEdit, (ctx, { transformBoxId }) => {
    startTransformBoxEdit(ctx, transformBoxId)
  })
  on(ctx, EndTransformBoxEdit, endTransformBoxEdit)
})

/**
 * Remove transform box and all handles.
 */
function removeTransformBox(ctx: Context, transformBoxId: EntityId): void {
  // Check if entity exists and has TransformBox component
  if (!hasComponent(ctx, transformBoxId, TransformBox)) {
    endTransformBoxEdit(ctx)
    return
  }

  // Remove all handles
  const handles = getBackrefs(ctx, transformBoxId, TransformHandle, 'transformBox')

  for (const handleId of handles) {
    removeEntity(ctx, handleId)
  }

  // Remove transform box entity
  removeEntity(ctx, transformBoxId)

  endTransformBoxEdit(ctx)
}

/**
 * Add transform box components to an entity.
 * The entity is created in the capture phase; this adds components and updates bounds.
 * @param skipHandles - If true, skip creating transform handles (used when entering edit mode directly)
 */
function addTransformBox(ctx: Context, transformBoxId: EntityId, skipHandles?: boolean): void {
  // Add components to the newly created entity
  addComponent(ctx, transformBoxId, Block, {
    tag: 'transform-box',
    position: [0, 0],
    size: [0, 0],
    rotateZ: 0,
    rank: TRANSFORM_BOX_RANK,
  })
  addComponent(ctx, transformBoxId, TransformBox, {})
  addComponent(ctx, transformBoxId, DragStart, {
    position: [0, 0],
    size: [0, 0],
    rotateZ: 0,
    fontSize: 16,
  })

  if (!skipHandles) {
    updateTransformBox(ctx, transformBoxId)
  }
}

/**
 * Update transform box bounds to match selection.
 */
function updateTransformBox(ctx: Context, transformBoxId: EntityId): void {
  if (!isAlive(ctx, transformBoxId)) return

  const selectedBlocks = selectedBlocksQuery.current(ctx)
  if (selectedBlocks.length === 0) return

  // Get common rotation (or 0 if mixed)
  let rotateZ = 0
  const firstBlock = Block.read(ctx, selectedBlocks[0])
  rotateZ = firstBlock.rotateZ

  for (let i = 1; i < selectedBlocks.length; i++) {
    const block = Block.read(ctx, selectedBlocks[i])
    if (Math.abs(rotateZ - block.rotateZ) > 0.01) {
      rotateZ = 0
      break
    }
  }

  // Compute bounding box of all selected blocks
  if (selectedBlocks.length === 0) return

  // Collect all corners from selected blocks
  const corners: Vec2[] = []
  for (const entityId of selectedBlocks) {
    const blockCorners = Block.getCorners(ctx, entityId)
    corners.push(...blockCorners)
  }

  if (corners.length === 0) return

  // Update transform box block using Rect.boundPoints which handles rotation
  const boxBlock = Block.write(ctx, transformBoxId)
  boxBlock.rotateZ = rotateZ
  Rect.boundPoints(boxBlock.position, boxBlock.size, rotateZ, corners)

  // Don't update DragStart if currently dragging - it would reset the delta calculation
  const selectionState = SelectionStateSingleton.read(ctx)
  const isDragging = selectionState.state === SelectionState.Dragging

  if (!isDragging) {
    // Update DragStart for transform box
    if (hasComponent(ctx, transformBoxId, DragStart)) {
      const dragStart = DragStart.write(ctx, transformBoxId)
      dragStart.position = boxBlock.position
      dragStart.size = boxBlock.size
      dragStart.rotateZ = rotateZ
    }

    // Update DragStart for selected blocks
    for (const entityId of selectedBlocks) {
      const block = Block.read(ctx, entityId)
      const fontSize = hasComponent(ctx, entityId, Text) ? Text.read(ctx, entityId).fontSizePx : 16

      if (!hasComponent(ctx, entityId, DragStart)) {
        addComponent(ctx, entityId, DragStart, {
          position: block.position,
          size: block.size,
          rotateZ: block.rotateZ,
          flip: block.flip,
          fontSize,
        })
      } else {
        const dragStart = DragStart.write(ctx, entityId)
        dragStart.position = block.position
        dragStart.size = block.size
        dragStart.rotateZ = block.rotateZ
        dragStart.flip = block.flip
        dragStart.fontSize = fontSize
      }
    }
  }

  // Update or create transform handles
  addOrUpdateTransformHandles(ctx, transformBoxId)
}

/**
 * Transform handle definition for creating handles.
 */
interface TransformHandleDef {
  tag: string
  kind: TransformHandleKind
  vectorX: number
  vectorY: number
  cursorKind: CursorKind
  left: number
  top: number
  width: number
  height: number
  rotateZ: number
  rank: string
  scaleMultiplier: [number, number]
  anchor: [number, number]
}

/**
 * Add or update transform handles around the transform box.
 */
function addOrUpdateTransformHandles(ctx: Context, transformBoxId: EntityId): void {
  const boxBlock = Block.read(ctx, transformBoxId)
  const { position, size, rotateZ } = boxBlock
  const left = position[0]
  const top = position[1]
  const width = size[0]
  const height = size[1]
  const center: Vec2 = [left + width / 2, top + height / 2]

  const handleSize = 12
  const rotationHandleSize = 2 * handleSize
  const sideHandleSize = 1.25 * handleSize

  const handles: TransformHandleDef[] = []

  const rotateCursorKinds = [CursorKind.RotateNW, CursorKind.RotateNE, CursorKind.RotateSW, CursorKind.RotateSE]

  // Get selected blocks and determine capabilities
  const selectedBlocks = selectedBlocksQuery.current(ctx)

  let resizeMode: ResizeMode = ResizeMode.Scale
  if (selectedBlocks.length === 1) {
    resizeMode = getBlockResizeMode(ctx, selectedBlocks[0])
  } else if (selectedBlocks.length > 1) {
    // If all blocks are "free" resize mode, use "free" for the transform box
    const allFree = selectedBlocks.every((id) => getBlockResizeMode(ctx, id) === ResizeMode.Free)
    if (allFree) resizeMode = ResizeMode.Free
  }

  // Check if all selected blocks can rotate/scale
  const canRotate = selectedBlocks.every((id) => {
    const block = Block.read(ctx, id)
    const blockDef = getBlockDef(ctx, block.tag)
    return blockDef.canRotate
  })

  const canScale = selectedBlocks.every((id) => {
    const block = Block.read(ctx, id)
    const blockDef = getBlockDef(ctx, block.tag)
    return blockDef.canScale
  })

  // Determine handle kind based on resize mode
  let handleKind: TransformHandleKind
  switch (resizeMode) {
    case 'scale':
    case 'text':
      handleKind = TransformHandleKind.Scale
      break
    case 'free':
      handleKind = TransformHandleKind.Stretch
      break
    default:
      handleKind = TransformHandleKind.Scale
      break
  }

  // Calculate scaled dimensions for visibility threshold
  const camera = Camera.read(ctx)
  const scaledWidth = width * camera.zoom
  const scaledHeight = height * camera.zoom
  const minDim = Math.min(scaledWidth, scaledHeight)
  const threshold = 15

  // Corner handles (scale and rotation)
  for (let xi = 0; xi < 2; xi++) {
    for (let yi = 0; yi < 2; yi++) {
      // Skip some corners when selection is too small
      if (xi + yi !== 1 && minDim < threshold / 2) {
        continue
      }
      if (xi + yi === 1 && scaledHeight < threshold) {
        continue
      }

      if (canScale) {
        // Corner scale handles
        handles.push({
          tag: 'transform-handle',
          kind: handleKind,
          vectorX: xi * 2 - 1,
          vectorY: yi * 2 - 1,
          left: left + width * xi - handleSize / 2,
          top: top + height * yi - handleSize / 2,
          width: handleSize,
          height: handleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_CORNER_RANK,
          cursorKind: xi + yi === 1 ? CursorKind.NESW : CursorKind.NWSE,
          scaleMultiplier: [1, 1],
          anchor: [0.5, 0.5],
        })
      }

      if (canRotate) {
        // Corner rotation handles
        handles.push({
          tag: 'transform-rotate',
          kind: TransformHandleKind.Rotate,
          vectorX: xi * 2 - 1,
          vectorY: yi * 2 - 1,
          left: left + xi * width - (1 - xi) * rotationHandleSize,
          top: top + yi * height - (1 - yi) * rotationHandleSize,
          width: rotationHandleSize,
          height: rotationHandleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_ROTATE_RANK,
          cursorKind: rotateCursorKinds[xi + yi * 2],
          scaleMultiplier: [0.5, 0.5],
          anchor: [1 - xi, 1 - yi], // Anchor toward block, expand away
        })
      }
    }
  }

  // Top & bottom edge handles
  if (canScale) {
    for (let yi = 0; yi < 2; yi++) {
      handles.push({
        tag: 'transform-edge',
        kind: handleKind,
        vectorX: 0,
        vectorY: yi * 2 - 1,
        left,
        top: top + height * yi - sideHandleSize / 2,
        width,
        height: sideHandleSize,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        cursorKind: CursorKind.NS,
        scaleMultiplier: [0, 1],
        anchor: [0.5, 0.5],
      })
    }
  }

  // Left & right edge handles
  if (canScale || resizeMode === ResizeMode.Text) {
    for (let xi = 0; xi < 2; xi++) {
      handles.push({
        tag: 'transform-edge',
        kind: resizeMode === ResizeMode.Text ? TransformHandleKind.Stretch : handleKind,
        vectorX: xi * 2 - 1,
        vectorY: 0,
        left: left + width * xi - sideHandleSize / 2,
        top,
        width: sideHandleSize,
        height,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        cursorKind: CursorKind.EW,
        scaleMultiplier: [1, 0],
        anchor: [0.5, 0.5],
      })
    }
  }

  // Get existing handles and build a map for reuse
  const existingHandles = getBackrefs(ctx, transformBoxId, TransformHandle, 'transformBox')
  const handleMap = new Map<string, EntityId>()
  for (const handleId of existingHandles) {
    const handle = TransformHandle.read(ctx, handleId)
    const key = `${handle.kind}-${handle.vectorX}-${handle.vectorY}`
    handleMap.set(key, handleId)
  }

  // Track which handles we're using
  const usedHandleIds = new Set<EntityId>()

  // Create or update handles
  for (const def of handles) {
    const key = `${def.kind}-${def.vectorX}-${def.vectorY}`
    let handleId = handleMap.get(key)

    // Calculate rotated position
    const handleCenter: Vec2 = [def.left + def.width / 2, def.top + def.height / 2]
    const rotatedCenter = Vec2.clone(handleCenter)
    Vec2.rotateAround(rotatedCenter, center, rotateZ)
    const finalLeft = rotatedCenter[0] - def.width / 2
    const finalTop = rotatedCenter[1] - def.height / 2

    if (!handleId) {
      handleId = createEntity(ctx)
      addComponent(ctx, handleId, Block)
      addComponent(ctx, handleId, TransformHandle)
      addComponent(ctx, handleId, DragStart)
      addComponent(ctx, handleId, ScaleWithZoom)
    }

    // Set handle parameters from definition
    const block = Block.write(ctx, handleId)
    block.tag = def.tag
    block.position = [finalLeft, finalTop]
    block.size = [def.width, def.height]
    block.rotateZ = def.rotateZ
    block.rank = def.rank

    const handle = TransformHandle.write(ctx, handleId)
    handle.transformBox = transformBoxId
    handle.kind = def.kind
    handle.vectorX = def.vectorX
    handle.vectorY = def.vectorY
    handle.cursorKind = def.cursorKind

    const dragStart = DragStart.write(ctx, handleId)
    dragStart.position = [finalLeft, finalTop]
    dragStart.size = [def.width, def.height]
    dragStart.rotateZ = def.rotateZ

    const swz = ScaleWithZoom.write(ctx, handleId)
    swz.startPosition = [finalLeft, finalTop]
    swz.startSize = [def.width, def.height]
    Vec2.copy(swz.scaleMultiplier, def.scaleMultiplier)
    Vec2.copy(swz.anchor, def.anchor)

    usedHandleIds.add(handleId)
  }

  // Remove unused handles
  for (const handleId of existingHandles) {
    if (!usedHandleIds.has(handleId)) {
      removeEntity(ctx, handleId)
    }
  }
}

/**
 * Hide transform box and handles.
 */
function hideTransformBox(ctx: Context, transformBoxId: EntityId): void {
  if (!hasComponent(ctx, transformBoxId, TransformBox)) return

  if (!hasComponent(ctx, transformBoxId, Opacity)) {
    addComponent(ctx, transformBoxId, Opacity, { value: 0 })
  } else {
    const opacity = Opacity.write(ctx, transformBoxId)
    opacity.value = 0
  }

  const handles = getBackrefs(ctx, transformBoxId, TransformHandle, 'transformBox')

  for (const handleId of handles) {
    if (!hasComponent(ctx, handleId, Opacity)) {
      addComponent(ctx, handleId, Opacity, { value: 0 })
    } else {
      const opacity = Opacity.write(ctx, handleId)
      opacity.value = 0
    }
  }
}

/**
 * Show transform box and handles.
 */
function showTransformBox(ctx: Context, transformBoxId: EntityId): void {
  if (!hasComponent(ctx, transformBoxId, TransformBox)) return

  // Don't show if current selection is not transformable
  const selectedBlocks = selectedBlocksQuery.current(ctx)
  if (selectedBlocks.length === 0) return
  if (selectedBlocks.length === 1) {
    if (getBlockResizeMode(ctx, selectedBlocks[0]) === ResizeMode.GroupOnly) return
  }

  if (hasComponent(ctx, transformBoxId, Opacity)) {
    removeComponent(ctx, transformBoxId, Opacity)
  }

  const handles = getBackrefs(ctx, transformBoxId, TransformHandle, 'transformBox')

  for (const handleId of handles) {
    if (hasComponent(ctx, handleId, Opacity)) {
      removeComponent(ctx, handleId, Opacity)
    }
  }

  // Update transform box to reflect any changes
  updateTransformBox(ctx, transformBoxId)
}

/**
 * Start transform box edit mode.
 */
function startTransformBoxEdit(ctx: Context, transformBoxId: EntityId): void {
  if (hasComponent(ctx, transformBoxId, TransformBox)) {
    const handles = getBackrefs(ctx, transformBoxId, TransformHandle, 'transformBox')
    for (const handleId of handles) {
      removeEntity(ctx, handleId)
    }
  }

  // Mark selected blocks as edited
  for (const blockId of selectedBlocksQuery.current(ctx)) {
    if (!hasComponent(ctx, blockId, Edited)) {
      addComponent(ctx, blockId, Edited, {})
    }
  }
}

/**
 * End transform box edit mode.
 */
function endTransformBoxEdit(ctx: Context): void {
  // Remove edited from blocks
  for (const blockId of editedBlocksQuery.current(ctx)) {
    if (hasComponent(ctx, blockId, Edited)) {
      removeComponent(ctx, blockId, Edited)
    }
  }
}
