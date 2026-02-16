<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@woven-canvas/core";

import MenuDropdown from "../MenuDropdown.vue";
import ColorBubbles from "../ColorBubbles.vue";
import IconChevronDown from "../../icons/IconChevronDown.vue";
import { useTextFormatting } from "../../../composables/useTextFormatting";
import { rgbToHex, type ColorData } from "../../../utils/color";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { state, commands } = useTextFormatting(() => props.entityIds);

// Get the current color from state
const currentColorHex = computed(() => {
  return state.color.value ?? "#000000";
});

// Style for the color underline
const underlineStyle = computed(() => {
  return { backgroundColor: currentColorHex.value };
});

function handleColorChange(color: ColorData) {
  commands.setColor(rgbToHex(color));
}
</script>

<template>
  <MenuDropdown title="Text Color">
    <template #button>
      <div class="ic-text-color-button">
        <div class="ic-text-icon-container">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            fill="currentColor"
            class="ic-text-icon"
          >
            <path
              d="M349.1 114.7C343.9 103.3 332.5 96 320 96C307.5 96 296.1 103.3 290.9 114.7L123.5 480L112 480C94.3 480 80 494.3 80 512C80 529.7 94.3 544 112 544L200 544C217.7 544 232 529.7 232 512C232 494.3 217.7 480 200 480L193.9 480L215.9 432L424.2 432L446.2 480L440.1 480C422.4 480 408.1 494.3 408.1 512C408.1 529.7 422.4 544 440.1 544L528.1 544C545.8 544 560.1 529.7 560.1 512C560.1 494.3 545.8 480 528.1 480L516.6 480L349.2 114.7zM394.8 368L245.2 368L320 204.8L394.8 368z"
            />
          </svg>
          <div class="ic-color-underline" :style="underlineStyle" />
        </div>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <ColorBubbles
        :currentColor="currentColorHex"
        :withPicker="true"
        @change="handleColorChange"
      />
    </template>
  </MenuDropdown>
</template>

<style>
.ic-text-color-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  margin: 0 8px;
}

.ic-text-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ic-text-icon {
  width: 16px;
  height: 16px;
}

.ic-color-underline {
  width: 100%;
  height: 3px;
  margin-top: 2px;
  border: 1px solid var(--ic-gray-500);
  border-radius: 1px;
}
</style>
