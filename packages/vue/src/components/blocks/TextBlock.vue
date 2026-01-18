<script setup lang="ts">
import { ref, watch } from "vue";

import type { BlockData } from "../../types";
import { useTextStretchBehavior } from "../../composables/useTextStretchBehavior";
import EditableText from "../EditableText.vue";

const props = defineProps<BlockData>();

const containerRef = ref<HTMLElement | null>(null);

// Use the text stretch behavior composable
const { handleEditEnd } = useTextStretchBehavior({
  blockData: props,
  containerRef,
});

watch(
  () => props.selected,
  () => {
    console.log("SELCTED");
  },
);
</script>

<template>
  <div ref="containerRef" class="ic-text-block">
    <EditableText v-bind="props" @edit-end="handleEditEnd" />
  </div>
</template>

<style>
.ic-text-block {
  width: fit-content;
  height: fit-content;
}

.ic-block[data-selected] > .ic-text-block {
  outline: none;
}
</style>
