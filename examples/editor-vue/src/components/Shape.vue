<script setup lang="ts">
import type { EntityId } from "@infinitecanvas/editor";
import { useComponent } from "@infinitecanvas/vue";
import { Shape } from "../Shape";

const props = defineProps<{
  entityId: EntityId;
}>();

const shape = useComponent(props.entityId, Shape);

function uint32ToHex(color: number): string {
  return "#" + color.toString(16).padStart(8, "0").slice(0, 6);
}
</script>

<template>
  <div
    v-if="shape"
    :style="{
      width: '100%',
      height: '100%',
      background: uint32ToHex(shape.color),
      borderRadius: '4px',
    }"
  ></div>
</template>
