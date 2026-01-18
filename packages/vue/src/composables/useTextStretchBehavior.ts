import {
  watch,
  onUnmounted,
  toValue,
  type Ref,
  type MaybeRefOrGetter,
} from "vue";
import { Block, Text, Camera, Screen } from "@infinitecanvas/editor";
import {
  UpdateTransformBox,
  TransformBoxStateSingleton,
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
   * by measuring the container.
   */
  handleEditEnd: (data: { content: string }) => void;
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

  function startResizeObserver() {
    if (resizeObserver) return; // Already observing

    const element = options.containerRef.value;
    if (!element) return;

    resizeObserver = new ResizeObserver(() => {
      nextEditorTick((ctx) => {
        const { entityId } = toValue(options.blockData);
        const block = Block.read(ctx, entityId);

        // Compute new dimensions from DOM
        const dimensions = computeBlockDimensions(element, camera, screen);

        // Apply min constraints
        const minW = toValue(options.minWidth) ?? 0;
        const minH = toValue(options.minHeight) ?? 0;
        const finalWidth = Math.max(dimensions.width, minW);
        const finalHeight = Math.max(dimensions.height, minH);

        // Only write if dimensions actually changed
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
  function handleEditEnd(data: { content: string }): void {
    const { content } = data;
    const element = options.containerRef.value;
    if (!element) return;

    nextEditorTick((ctx) => {
      const { entityId } = toValue(options.blockData);

      // Save text content
      const text = Text.read(ctx, entityId);
      if (text.content === content) return;

      const writableText = Text.write(ctx, entityId);
      writableText.content = content;

      // Measure container (includes padding, etc.)
      const dimensions = computeBlockDimensions(element, camera, screen);

      // Apply min constraints
      const minW = toValue(options.minWidth) ?? 0;
      const minH = toValue(options.minHeight) ?? 0;
      const finalWidth = Math.max(dimensions.width, minW);
      const finalHeight = Math.max(dimensions.height, minH);

      const block = Block.write(ctx, entityId);
      block.size = [finalWidth, finalHeight];
      block.position = [dimensions.left, dimensions.top];
    });
  }

  onUnmounted(() => {
    stopResizeObserver();
  });

  return {
    handleEditEnd,
  };
}
