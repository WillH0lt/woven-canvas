<script setup lang="ts">
import { ref } from "vue";

import type { BlockData } from "../../types";
import { useTextStretchBehavior } from "../../composables/useTextStretchBehavior";
import EditableText from "../EditableText.vue";

const props = defineProps<BlockData>();

// Ref to EditableText component for accessing its element
const editableTextRef = ref<InstanceType<typeof EditableText> | null>(null);

// Use the text stretch behavior composable
const { handleEditEnd } = useTextStretchBehavior({
  blockData: props,
  behavior: "growAndShrinkBlock",
  editableTextRef,
});
</script>

<template>
  <EditableText
    ref="editableTextRef"
    class="ic-text-block"
    v-bind="props"
    @edit-end="handleEditEnd"
  />
</template>

<style>
.ic-block[data-selected] > .ic-text-block {
  outline: none;
}
</style>
