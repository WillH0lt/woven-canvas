<script setup lang="ts">
import type { EntityId } from "@woven-canvas/core";

import MenuButton from "../MenuButton.vue";
import { useTextFormatting } from "../../../composables/useTextFormatting";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { state, commands } = useTextFormatting(() => props.entityIds);
</script>

<template>
  <MenuButton
    title="Italic"
    :class="{ 'ic-active': state.isItalic.value }"
    @click="commands.toggleItalic"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 384 512"
      fill="currentColor"
    >
      <path
        d="M128 64c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-58.7 0L160 416l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l58.7 0L224 96l-64 0c-17.7 0-32-14.3-32-32z"
      />
    </svg>
  </MenuButton>
</template>
