<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@infinitecanvas/editor";
import { useComponent } from "../composables/useComponent";
import { Color } from "@infinitecanvas/editor";

const props = defineProps<{
  entityId: EntityId;
}>();

const color = useComponent(props.entityId, Color);

const containerStyle = computed(() => ({
  backgroundColor: color.value
    ? `rgb(${color.value.red}, ${color.value.green}, ${color.value.blue})`
    : undefined,
}));
</script>

<template>
  <div class="ic-sticky-note" :style="containerStyle">
    <slot />
  </div>
</template>

<style>
.ic-sticky-note {
  width: 100%;
  display: flex;
  padding: 8%;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
  box-shadow: rgba(16, 24, 32, 0.65) 0px 4px 5px -6px,
    rgba(16, 24, 32, 0.45) 0px 11px 13px -12px,
    rgba(16, 24, 45, 0.025) 0px 45px 10px -12px inset;
}
</style>
