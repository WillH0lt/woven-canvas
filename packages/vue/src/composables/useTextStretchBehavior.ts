import {
  ref,
  watch,
  onUnmounted,
  toValue,
  type Ref,
  type MaybeRefOrGetter,
} from "vue";
import {
  Block,
  Text,
  hasComponent,
  type Context,
} from "@infinitecanvas/editor";
import {
  SelectionStateSingleton,
  TransformHandleKind,
  TransformHandle,
} from "@infinitecanvas/plugin-selection";

import { useSingleton } from "./useSingleton";
import { useEditorContext } from "./useEditorContext";
import type { BlockData } from "../types";

/**
 * Text stretch behavior options.
 * - 'growAndShrinkBlock': Block resizes to fit text content (both grow and shrink)
 * - 'growBlock': Block can grow but not shrink smaller than starting dimensions
 * - 'none': No automatic text-based resizing (custom handling required)
 */
export type TextStretchBehavior = "growAndShrinkBlock" | "growBlock";

export interface TextStretchBehaviorOptions {
  blockData: MaybeRefOrGetter<BlockData>;
  behavior: TextStretchBehavior;
  editableTextRef: Ref<{ editableTextRef: HTMLElement | null } | null>;
}

export interface TextStretchBehaviorResult {
  /**
   * Call this when text editing ends.
   * Handles saving the text content and updating block dimensions
   * based on the configured behavior mode.
   */
  handleEditEnd: (data: {
    content: string;
    width: number;
    height: number;
  }) => void;
}

/**
 * Composable for handling text stretch behavior on blocks.
 *
 * Supports three modes:
 * - 'growAndShrinkBlock': Block resizes to fit text content (both grow and shrink)
 * - 'growBlock': Block can grow but not shrink smaller than starting dimensions
 * - 'none': No automatic text-based resizing (only saves text content)
 */
export function useTextStretchBehavior(
  options: TextStretchBehaviorOptions
): TextStretchBehaviorResult {
  const { behavior, editableTextRef } = options;

  const selectionState = useSingleton(SelectionStateSingleton);
  const { nextEditorTick } = useEditorContext();

  // Cache starting dimensions for 'growBlock' mode
  // Set when stretch starts or editing starts
  const cachedStartWidth = ref<number | null>(null);
  const cachedStartHeight = ref<number | null>(null);

  // ResizeObserver for stretch operations
  let resizeObserver: ResizeObserver | null = null;

  function startStretchObserver(ctx: Context) {
    const element = editableTextRef.value?.editableTextRef;
    if (!element) return;

    const proseMirror = element.querySelector(".ProseMirror");
    if (!proseMirror) return;

    const { entityId } = toValue(options.blockData);

    // Cache starting width for 'growBlock' mode
    if (behavior === "growBlock") {
      const block = Block.read(ctx, entityId);
      cachedStartWidth.value = block.size[0];
    }

    resizeObserver = new ResizeObserver(() => {
      if (!proseMirror) return;

      nextEditorTick((ctx) => {
        const newHeight = (proseMirror as HTMLElement).offsetHeight;
        const { entityId } = toValue(options.blockData);
        const block = Block.read(ctx, entityId);

        let finalHeight = newHeight;

        // For 'growBlock' mode, don't shrink below cached starting width
        if (behavior === "growBlock" && cachedStartWidth.value !== null) {
          finalHeight = Math.max(newHeight, cachedStartWidth.value);
        }

        if (block.size[1] === finalHeight) return;

        const writableBlock = Block.write(ctx, entityId);
        writableBlock.size[1] = finalHeight;
      });
    });
    resizeObserver.observe(element);
  }

  function stopStretchObserver() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    // Reset cached width when stretch ends
    cachedStartWidth.value = null;
  }

  // Watch for stretch handle drags
  watch(
    selectionState,
    () => {
      nextEditorTick((ctx) => {
        const { selected } = toValue(options.blockData);
        if (!selected) {
          stopStretchObserver();
          return;
        }

        const draggedEntity = selectionState.value?.draggedEntity;

        // Clean up if no longer dragging
        if (draggedEntity === null) {
          stopStretchObserver();
          return;
        }

        // Check if this is a stretch handle drag
        if (!hasComponent(ctx, draggedEntity, TransformHandle)) {
          stopStretchObserver();
          return;
        }

        const kind = TransformHandle.read(ctx, draggedEntity).kind;
        if (kind === TransformHandleKind.Stretch) {
          if (!resizeObserver) {
            startStretchObserver(ctx);
          }
        } else {
          stopStretchObserver();
        }
      });
    },
    { immediate: true }
  );

  // Watch for edit mode changes to cache starting height
  watch(
    () => toValue(options.blockData).edited,
    (isEdited) => {
      if (behavior !== "growBlock") return;

      if (isEdited) {
        // Cache starting height when edit mode starts
        nextEditorTick((ctx) => {
          const { entityId } = toValue(options.blockData);
          const block = Block.read(ctx, entityId);
          cachedStartHeight.value = block.size[1];
        });
      } else {
        // Reset cached height when edit mode ends
        cachedStartHeight.value = null;
      }
    },
    { immediate: true }
  );

  /**
   * Handle edit end - saves text content and updates block dimensions.
   */
  function handleEditEnd(data: {
    content: string;
    width: number;
    height: number;
  }): void {
    const { content, width, height } = data;

    nextEditorTick((ctx) => {
      const { entityId } = toValue(options.blockData);

      // Save text content
      const textComponent = Text.write(ctx, entityId);
      textComponent.content = content;

      // Skip if dimensions are invalid
      if (width === 0 || height === 0) return;

      const block = Block.read(ctx, entityId);

      let finalWidth = width;
      let finalHeight = height;

      if (behavior === "growBlock") {
        // Don't shrink below starting height
        const minHeight = cachedStartHeight.value ?? block.size[1];
        finalHeight = Math.max(height, minHeight);
        // Width stays unchanged for growBlock
        finalWidth = block.size[0];
      }

      // Skip update if nothing changed
      if (block.size[0] === finalWidth && block.size[1] === finalHeight) return;

      const writableBlock = Block.write(ctx, entityId);
      writableBlock.size = [finalWidth, finalHeight];
    });
  }

  onUnmounted(() => {
    stopStretchObserver();
    cachedStartHeight.value = null;
    cachedStartWidth.value = null;
  });

  return {
    handleEditEnd,
  };
}
