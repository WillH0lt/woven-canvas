<script setup lang="ts">
import { ref } from "vue";
import { Color } from "@infinitecanvas/editor";
import {
  useComponent,
  useTextStretchBehavior,
  type BlockData,
  EditableText,
} from "@infinitecanvas/vue";

import { Shape } from "../Shape";

const props = defineProps<BlockData>();

const shape = useComponent(props.entityId, Shape);
const color = useComponent(props.entityId, Color);

// Ref to EditableText component for accessing its element
const editableTextRef = ref<InstanceType<typeof EditableText> | null>(null);

// Use the text stretch behavior composable with 'growBlock' mode
// This allows the block to grow in height to fit text, but not shrink
// smaller than the starting dimensions
const { handleEditEnd } = useTextStretchBehavior({
  blockData: () => props,
  behavior: "growBlock",
  editableTextRef,
});
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      border: shape?.border + 'px solid black',
      borderRadius: '4px',
      backgroundColor: `rgb(${color?.red}, ${color?.green}, ${color?.blue})`,
      display: 'flex',
      padding: '8px',
    }"
  >
    <EditableText ref="editableTextRef" v-bind="props" @edit-end="handleEditEnd" />
  </div>
</template>
