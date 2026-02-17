<script setup lang="ts">
import { computed, ref } from "vue";
import { useComponent } from "../../composables/useComponent";
import { useEditorContext } from "../../composables/useEditorContext";
import { Text, VerticalAlign, VerticalAlignment } from "@woven-canvas/core";
import { Shape, StrokeKind } from "../../Shape";
import { SHAPES } from "../../shapes";
import type { BlockData } from "../../types";
import EditableText from "../EditableText.vue";

const props = defineProps<BlockData>();

const shape = useComponent(props.entityId, Shape);
const verticalAlign = useComponent(props.entityId, VerticalAlign);

const containerRef = ref<HTMLElement | null>(null);

const alignItemsMap: Record<string, string> = {
  [VerticalAlignment.Top]: "flex-start",
  [VerticalAlignment.Center]: "center",
  [VerticalAlignment.Bottom]: "flex-end",
};

// Fill color from Color component (for background)
const fillColor = computed(() => {
  if (!shape.value) return "rgba(0, 0, 0, 0)";
  return `rgba(${shape.value.fillRed}, ${shape.value.fillGreen}, ${shape.value.fillBlue}, ${(shape.value.fillAlpha ?? 255) / 255})`;
});

// Stroke color from Shape component (returns "none" when StrokeKind.None)
const strokeColor = computed(() => {
  if (!shape.value) return "rgba(0, 0, 0, 1)";
  if (shape.value.strokeKind === StrokeKind.None) return "none";
  return `rgba(${shape.value.strokeRed}, ${shape.value.strokeGreen}, ${shape.value.strokeBlue}, ${shape.value.strokeAlpha / 255})`;
});

// Stroke width
const strokeWidth = computed(() => shape.value?.strokeWidth ?? 2);

// Stroke kind
const strokeKind = computed(() => shape.value?.strokeKind ?? StrokeKind.Solid);

// Shape path from SHAPES constant
const shapePath = computed(
  () => SHAPES[shape.value?.kind ?? "rectangle"] ?? SHAPES.rectangle
);

// Stroke dash array
const strokeDashArray = computed(() => {
  const width = strokeWidth.value;
  switch (strokeKind.value) {
    case StrokeKind.Dashed:
      return `${width * 3} ${width * 3}`;
    case StrokeKind.None:
      return "";
    case StrokeKind.Solid:
    default:
      return "";
  }
});

// Content style - overflow visible when editing for text measurement
const contentStyle = computed(() => ({
  overflow: props.edited ? "visible" : "hidden",
  alignItems:
    alignItemsMap[verticalAlign.value?.value ?? VerticalAlignment.Top],
}));

const { nextEditorTick } = useEditorContext();

// Handle edit end - just save content, don't resize block
function handleEditEnd(data: { content: string }) {
  nextEditorTick((ctx) => {
    const text = Text.read(ctx, props.entityId);
    if (text.content === data.content) return;

    const writableText = Text.write(ctx, props.entityId);
    writableText.content = data.content;
  });
}
</script>

<template>
  <div ref="containerRef" class="ic-shape-block">
    <svg class="ic-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        :d="shapePath"
        :fill="fillColor"
        :stroke="strokeColor"
        :stroke-width="strokeWidth"
        :stroke-dasharray="strokeDashArray"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <div class="ic-shape-content" :style="contentStyle">
      <EditableText
        v-bind="props"
        :block-element="containerRef"
        @edit-end="handleEditEnd"
      />
    </div>
  </div>
</template>

<style>
.ic-shape-block {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  box-sizing: border-box;
}

.ic-shape-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: -1;
}

.ic-shape-content {
  width: 100%;
  height: 100%;
  display: flex;
  box-sizing: border-box;
  padding: 8px;
  z-index: 1;
}
</style>
