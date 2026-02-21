import { Block, Camera, type Context, hasComponent, Screen, Text } from '@woven-canvas/core'
import {
  SelectionState,
  SelectionStateSingleton,
  TransformBoxStateSingleton,
  TransformHandle,
  TransformHandleKind,
  UpdateTransformBox,
} from '@woven-canvas/plugin-selection'
import { type MaybeRefOrGetter, type Ref, toValue, watch } from 'vue'
import type { BlockData } from '../types'
import { type BlockDimensions, computeBlockDimensions } from '../utils/blockDimensions'
import { useEditorContext } from './useEditorContext'
import { useSingleton } from './useSingleton'

export interface TextStretchBehaviorOptions {
  blockData: MaybeRefOrGetter<BlockData>
  /**
   * Container ref to observe for size changes.
   */
  containerRef: Ref<HTMLElement | null>
  /**
   * Minimum width constraint. Width will not shrink below this value.
   */
  minWidth?: MaybeRefOrGetter<number>
  /**
   * Minimum height constraint. Height will not shrink below this value.
   */
  minHeight?: MaybeRefOrGetter<number>
}

export interface TextStretchBehaviorResult {
  /**
   * Call this when text editing ends.
   * Handles saving the text content and updating block dimensions
   * using the provided dimensions from EditableText.
   */
  handleEditEnd: (data: { content: string; width: number; height: number; left: number; top: number }) => void
}

/**
 * Composable for handling text stretch behavior on blocks.
 *
 * Watches selection state reactively and updates block dimensions once
 * when stretching ends, respecting minWidth/minHeight constraints.
 */
export function useTextStretchBehavior(options: TextStretchBehaviorOptions): TextStretchBehaviorResult {
  const camera = useSingleton(Camera)
  const screen = useSingleton(Screen)
  const TransformBoxState = useSingleton(TransformBoxStateSingleton)
  const selectionState = useSingleton(SelectionStateSingleton)
  const { nextEditorTick } = useEditorContext()

  let wasStretching = false
  let pendingDimensions: BlockDimensions | null = null

  /**
   * Updates block dimensions with min constraints applied.
   */
  function applyBlockDimensions(ctx: Context, dimensions: BlockDimensions): void {
    const { entityId } = toValue(options.blockData)

    // Apply min constraints
    const minW = toValue(options.minWidth) ?? 0
    const minH = toValue(options.minHeight) ?? 0
    const finalWidth = Math.max(dimensions.width, minW)
    const finalHeight = Math.max(dimensions.height, minH)

    // Only write if dimensions actually changed
    const block = Block.read(ctx, entityId)
    const widthChanged = Math.abs(block.size[0] - finalWidth) > 0.5
    const heightChanged = Math.abs(block.size[1] - finalHeight) > 0.5

    if (!widthChanged && !heightChanged) return

    const writableBlock = Block.write(ctx, entityId)
    writableBlock.size = [finalWidth, finalHeight]
    writableBlock.position = [dimensions.left, dimensions.top]

    if (TransformBoxState.value.transformBoxId !== null) {
      UpdateTransformBox.spawn(ctx, {
        transformBoxId: TransformBoxState.value.transformBoxId,
      })
    }
  }

  // Watch selection state for stretch end
  // Use flush: 'sync' to run immediately when state changes
  watch(
    () => selectionState.value,
    () => {
      // Compute dimensions synchronously (DOM measurement doesn't need ECS context)
      const element = options.containerRef.value
      if (element && wasStretching) {
        pendingDimensions = computeBlockDimensions(element, camera, screen)
      }

      nextEditorTick((ctx) => {
        const currentlyStretching = isStretching(ctx)

        // If stretch just ended, apply pre-computed dimensions
        if (wasStretching && !currentlyStretching && pendingDimensions) {
          applyBlockDimensions(ctx, pendingDimensions)
          pendingDimensions = null
        }

        wasStretching = currentlyStretching
      })
    },
    { flush: 'sync' },
  )

  /**
   * Handle edit end - saves text content and updates block dimensions.
   */
  function handleEditEnd(data: { content: string; width: number; height: number; left: number; top: number }): void {
    const { content, ...dimensions } = data

    nextEditorTick((ctx) => {
      const { entityId } = toValue(options.blockData)

      // Save text content
      const text = Text.read(ctx, entityId)
      if (text.content !== content) {
        const writableText = Text.write(ctx, entityId)
        writableText.content = content
      }

      applyBlockDimensions(ctx, dimensions)
    })
  }

  return {
    handleEditEnd,
  }
}

function isStretching(ctx: Context): boolean {
  const selectionState = SelectionStateSingleton.read(ctx)
  return (
    selectionState.state === SelectionState.Dragging &&
    selectionState.draggedEntity !== null &&
    hasComponent(ctx, selectionState.draggedEntity, TransformHandle) &&
    TransformHandle.read(ctx, selectionState.draggedEntity).kind === TransformHandleKind.Stretch
  )
}
