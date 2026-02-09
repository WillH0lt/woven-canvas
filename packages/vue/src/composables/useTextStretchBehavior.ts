import {
  watch,
  onUnmounted,
  toValue,
  type Ref,
  type MaybeRefOrGetter,
} from "vue";
import {
  Block,
  Text,
  Camera,
  Screen,
  hasComponent,
  type Context,
} from "@infinitecanvas/editor";
import {
  UpdateTransformBox,
  TransformBoxStateSingleton,
  SelectionStateSingleton,
  SelectionState,
  TransformHandle,
  TransformHandleKind,
} from "@infinitecanvas/plugin-selection";

import { useSingleton } from "./useSingleton";
import { useEditorContext } from "./useEditorContext";
import { computeBlockDimensions } from "../utils/blockDimensions";
import type { BlockData } from "../types";

export interface TextStretchBehaviorOptions {
  blockData: MaybeRefOrGetter<BlockData>;
  /**
   * Container ref to observe for size changes.
   */
  containerRef: Ref<HTMLElement | null>;
  /**
   * Minimum width constraint. Width will not shrink below this value.
   */
  minWidth?: MaybeRefOrGetter<number>;
  /**
   * Minimum height constraint. Height will not shrink below this value.
   */
  minHeight?: MaybeRefOrGetter<number>;
}

export interface TextStretchBehaviorResult {
  /**
   * Call this when text editing ends.
   * Handles saving the text content and updating block dimensions
   * using the provided dimensions from EditableText.
   */
  handleEditEnd: (data: {
    content: string;
    width: number;
    height: number;
    left: number;
    top: number;
  }) => void;
}

/**
 * Composable for handling text stretch behavior on blocks.
 *
 * Observes the element for size changes and updates block dimensions,
 * respecting minWidth/minHeight constraints.
 */
export function useTextStretchBehavior(
  options: TextStretchBehaviorOptions,
): TextStretchBehaviorResult {
  const camera = useSingleton(Camera);
  const screen = useSingleton(Screen);
  const TransformBoxState = useSingleton(TransformBoxStateSingleton);
  const { nextEditorTick } = useEditorContext();

  // ResizeObserver for content-driven resizes
  let resizeObserver: ResizeObserver | null = null;

  interface Dimensions {
    width: number;
    height: number;
    left: number;
    top: number;
  }

  /**
   * Updates block dimensions with min constraints applied.
   */
  function applyBlockDimensions(ctx: Context, dimensions: Dimensions): void {
    const { entityId } = toValue(options.blockData);

    // Apply min constraints
    const minW = toValue(options.minWidth) ?? 0;
    const minH = toValue(options.minHeight) ?? 0;
    const finalWidth = Math.max(dimensions.width, minW);
    const finalHeight = Math.max(dimensions.height, minH);

    // Only write if dimensions actually changed
    const block = Block.read(ctx, entityId);
    const widthChanged = Math.abs(block.size[0] - finalWidth) > 0.5;
    const heightChanged = Math.abs(block.size[1] - finalHeight) > 0.5;

    if (!widthChanged && !heightChanged) return;

    const writableBlock = Block.write(ctx, entityId);
    writableBlock.size = [finalWidth, finalHeight];
    writableBlock.position = [dimensions.left, dimensions.top];

    if (TransformBoxState.value.transformBoxId !== null) {
      UpdateTransformBox.spawn(ctx, {
        transformBoxId: TransformBoxState.value.transformBoxId,
      });
    }
  }

  function startResizeObserver() {
    if (resizeObserver) return; // Already observing

    const element = options.containerRef.value;
    if (!element) return;

    resizeObserver = new ResizeObserver(() => {
      nextEditorTick((ctx) => {
        if (!isStretching(ctx)) return;

        const dimensions = computeBlockDimensions(element, camera, screen);
        applyBlockDimensions(ctx, dimensions);
      });
    });
    resizeObserver.observe(element);
  }

  function stopResizeObserver() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  // Watch for selection state changes
  watch(
    () => {
      const blockData = toValue(options.blockData);
      return [blockData.selected, blockData.edited] as const;
    },
    ([selected, edited]) => {
      if (selected && !edited) {
        startResizeObserver();
      } else {
        stopResizeObserver();
      }
    },
    { immediate: true },
  );

  /**
   * Handle edit end - saves text content and updates block dimensions.
   */
  function handleEditEnd(data: {
    content: string;
    width: number;
    height: number;
    left: number;
    top: number;
  }): void {
    const { content, ...dimensions } = data;

    nextEditorTick((ctx) => {
      const { entityId } = toValue(options.blockData);

      // Save text content
      const text = Text.read(ctx, entityId);
      if (text.content !== content) {
        const writableText = Text.write(ctx, entityId);
        writableText.content = content;
      }

      applyBlockDimensions(ctx, dimensions);
    });
  }

  onUnmounted(() => {
    stopResizeObserver();
  });

  return {
    handleEditEnd,
  };
}

function isStretching(ctx: Context): boolean {
  const selectionState = SelectionStateSingleton.read(ctx);
  return (
    selectionState.state === SelectionState.Dragging &&
    selectionState.draggedEntity !== null &&
    hasComponent(ctx, selectionState.draggedEntity, TransformHandle) &&
    TransformHandle.read(ctx, selectionState.draggedEntity).kind ===
      TransformHandleKind.Stretch
  );
}
