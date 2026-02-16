<script setup lang="ts">
import { computed, ref } from "vue";
import { Text } from "@woven-canvas/core";

import type { BlockData } from "../../types";
import { useComponent } from "../../composables/useComponent";
import { useTextStretchBehavior } from "../../composables/useTextStretchBehavior";
import EditableText from "../EditableText.vue";

const props = defineProps<BlockData>();

const containerRef = ref<HTMLElement | null>(null);
const text = useComponent(props.entityId, Text);

const isEmpty = computed(() => {
  const content = text.value?.content ?? "";
  const stripped = content.replace(/<[^>]*>/g, "").trim();
  return stripped.length === 0;
});

// Use the text stretch behavior composable
const { handleEditEnd } = useTextStretchBehavior({
  blockData: props,
  containerRef,
});
</script>

<template>
  <div
    ref="containerRef"
    class="ic-text-block"
    :data-text-empty="isEmpty || undefined"
  >
    <EditableText
      v-bind="props"
      :block-element="containerRef"
      @edit-end="handleEditEnd"
    />
  </div>
</template>

<style>
.ic-block[data-selected] > .ic-text-block {
  outline: none;
}

.ic-block[data-held-by-other] > .ic-text-block[data-text-empty] {
  outline: none;
}
</style>
