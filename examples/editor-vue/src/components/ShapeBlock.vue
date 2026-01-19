<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Color,
  Text,
  VerticalAlign,
  VerticalAlignment,
} from "@infinitecanvas/editor";
import {
  useComponent,
  type BlockData,
  useEditorContext,
  EditableText,
} from "@infinitecanvas/vue";

import { Shape } from "../Shape";

const props = defineProps<BlockData>();

const shape = useComponent(props.entityId, Shape);
const color = useComponent(props.entityId, Color);
const verticalAlign = useComponent(props.entityId, VerticalAlign);

const containerRef = ref<HTMLElement | null>(null);
const { nextEditorTick } = useEditorContext();

const alignItemsMap: Record<string, string> = {
  [VerticalAlignment.Top]: "flex-start",
  [VerticalAlignment.Center]: "center",
  [VerticalAlignment.Bottom]: "flex-end",
};

const containerStyle = computed(() => ({
  backgroundColor: `rgb(${color?.value?.red ?? 0}, ${color?.value?.green ?? 0}, ${color?.value?.blue ?? 0})`,
  border: (shape?.value?.border ?? 0) + "px solid black",
  overflow: props.edited ? "visible" : "hidden",
  alignItems:
    alignItemsMap[verticalAlign.value?.value ?? VerticalAlignment.Top],
}));

function handleEditEnd(data: { content: string }) {
  nextEditorTick((ctx) => {
    const entityId = props.entityId;
    const text = Text.read(ctx, entityId);

    if (text.content === data.content) return;

    const writableText = Text.write(ctx, entityId);
    writableText.content = data.content;
  });
}
</script>

<template>
  <div ref="containerRef" class="shape-block" :style="containerStyle">
    <EditableText
      v-bind="props"
      :block-element="containerRef"
      @edit-end="handleEditEnd"
    />
  </div>
</template>

<style>
.shape-block {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: 4px;
  display: flex;
  padding: 8px;
}
</style>
