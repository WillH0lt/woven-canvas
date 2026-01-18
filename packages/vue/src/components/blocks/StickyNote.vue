<script setup lang="ts">
import { computed, ref } from "vue";
import { useComponent } from "../../composables/useComponent";
import { useTextStretchBehavior } from "../../composables/useTextStretchBehavior";
import { Color } from "@infinitecanvas/editor";
import type { BlockData } from "../../types";
import EditableText from "../EditableText.vue";

const props = defineProps<BlockData>();

const color = useComponent(props.entityId, Color);

const containerRef = ref<HTMLElement | null>(null);

const containerStyle = computed(() => ({
  backgroundColor: color.value
    ? `rgb(${color.value.red}, ${color.value.green}, ${color.value.blue})`
    : undefined,
  // Min-height = block width * zoom to maintain square minimum
  minHeight: `calc(${props.block.size[0]}px * var(--ic-zoom))`,
}));

// Use composable for text stretch behavior with square minimum height
const { handleEditEnd } = useTextStretchBehavior({
  blockData: props,
  containerRef,
  minWidth: () => props.block.size[0],
  minHeight: () => props.block.size[0],
});
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
  box-shadow:
    rgba(16, 24, 32, 0.65) 0px 4px 5px -6px,
    rgba(16, 24, 32, 0.45) 0px 11px 13px -12px,
    rgba(16, 24, 45, 0.025) 0px 45px 10px -12px inset;
}
</style>
