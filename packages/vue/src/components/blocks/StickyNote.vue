<script setup lang="ts">
import { computed, ref } from "vue";
import { useComponent } from "../../composables/useComponent";
import { useEditorContext } from "../../composables/useEditorContext";
import { Color, Block, Text } from "@infinitecanvas/editor";
import type { BlockData } from "../../types";
import EditableText from "../EditableText.vue";

const props = defineProps<BlockData>();

const { nextEditorTick } = useEditorContext();
const color = useComponent(props.entityId, Color);
const containerRef = ref<HTMLElement | null>(null);

const containerStyle = computed(() => ({
  backgroundColor: color.value
    ? `rgb(${color.value.red}, ${color.value.green}, ${color.value.blue})`
    : undefined,
  // Min-height = block width * zoom to maintain square minimum
  minHeight: `calc(${props.block.size[0]}px * var(--ic-zoom))`,
}));

function handleEditEnd(data: {
  content: string;
  width: number;
  height: number;
}) {
  if (!containerRef.value) return;

  // Get container width (constrained by block)
  const containerWidth = containerRef.value.offsetWidth;

  // Calculate content height including padding (8% top + 8% bottom = 16% of width)
  const padding = containerWidth * 0.08;
  const contentHeight = data.height + padding * 2;

  // Height should be at least square (containerWidth), but can grow taller
  const finalHeight = Math.max(containerWidth, contentHeight);

  nextEditorTick((ctx) => {
    // Save text content
    const textComponent = Text.write(ctx, props.entityId);
    textComponent.content = data.content;

    // Update block size - width stays same, height may grow
    if (containerWidth === 0 || finalHeight === 0) return;

    const block = Block.read(ctx, props.entityId);
    if (block.size[0] === containerWidth && block.size[1] === finalHeight)
      return;

    const writableBlock = Block.write(ctx, props.entityId);
    writableBlock.size = [containerWidth, finalHeight];
  });
}
</script>

<template>
  <div ref="containerRef" class="ic-sticky-note" :style="containerStyle">
    <EditableText v-bind="props" @edit-end="handleEditEnd" />
  </div>
</template>

<style>
.ic-sticky-note {
  width: 100%;
  height: fit-content;
  display: flex;
  padding: 8%;
  box-sizing: border-box;
  box-shadow: rgba(16, 24, 32, 0.65) 0px 4px 5px -6px,
    rgba(16, 24, 32, 0.45) 0px 11px 13px -12px,
    rgba(16, 24, 45, 0.025) 0px 45px 10px -12px inset;
}
</style>
