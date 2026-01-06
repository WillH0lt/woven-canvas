<script setup lang="ts">
import type { EntityId } from "@infinitecanvas/editor";
import { useRectBlock } from "../RectPlugin";

const props = defineProps<{
  entityId: EntityId;
}>();

const { rect } = useRectBlock(props.entityId);

function uint32ToHex(color: number): string {
  return "#" + color.toString(16).padStart(8, "0").slice(0, 6);
}
</script>

<template>
  <div
    class="rect-block"
    :style="{
      width: '100%',
      height: '100%',
      background: uint32ToHex(rect.color),
      borderRadius: '4px',
    }"
  ></div>
</template>
