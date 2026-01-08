<script setup lang="ts">
import { type EntityId, Color } from "@infinitecanvas/editor";
import { useComponent } from "@infinitecanvas/vue";

import { Shape } from "../Shape";

const props = defineProps<{
  entityId: EntityId;
}>();

const shape = useComponent(props.entityId, Shape);
const color = useComponent(props.entityId, Color);
</script>

<template>
  <div
    v-if="color && shape"
    :style="{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      border: shape.border + 'px solid black',
      borderRadius: '4px',
      backgroundColor: `rgb(${color.red}, ${color.green}, ${color.blue})`,
    }"
  ></div>
</template>
