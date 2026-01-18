<script setup lang="ts">
import { ref } from "vue";
import { Color, Text } from "@infinitecanvas/editor";
import {
  useComponent,
  useTextStretchBehavior,
  type BlockData,
  useEditorContext,
  EditableText,
} from "@infinitecanvas/vue";

import { Shape } from "../Shape";

const props = defineProps<BlockData>();

const shape = useComponent(props.entityId, Shape);
const color = useComponent(props.entityId, Color);

const { nextEditorTick } = useEditorContext();

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
  <div
    class="shape-block"
    :style="{
      backgroundColor: `rgb(${color?.red}, ${color?.green}, ${color?.blue})`,
      border: shape?.border + 'px solid black',
      overflow: props.edited ? 'visible' : 'hidden',
    }"
  >
    <EditableText v-bind="props" @edit-end="handleEditEnd" />
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
