<script setup lang="ts">
import { inject, computed, ref, provide, type Ref } from "vue";
import { useElementSize } from "@vueuse/core";
import type { EntityId } from "@woven-canvas/core";

import MenuDropdown from "../MenuDropdown.vue";
import { DROPDOWN_ACTIVE_KEY } from "../../../injection";
import IconChevronDown from "../../icons/IconChevronDown.vue";
import TextFontFamilyButton from "./TextFontFamilyButton.vue";
import TextFontSizeButton from "./TextFontSizeButton.vue";
import TextBoldButton from "./TextBoldButton.vue";
import TextItalicButton from "./TextItalicButton.vue";
import TextUnderlineButton from "./TextUnderlineButton.vue";
import TextColorButton from "./TextColorButton.vue";
import TextAlignmentButton from "./TextAlignmentButton.vue";
import VerticalAlignButton from "./VerticalAlignButton.vue";
import { useTextFormatting } from "../../../composables/useTextFormatting";

const props = defineProps<{
  entityIds: EntityId[];
  showVerticalAlign?: boolean;
}>();

const { state } = useTextFormatting(() => props.entityIds);

// Get container ref to measure width
const containerRef = inject<Ref<HTMLElement | null>>("containerRef");
const { width } = useElementSize(containerRef);

// Use compact mode when container is narrow
const useCompactMode = computed(() => width.value > 0 && width.value < 600);

// Provide dropdown coordination context so only one dropdown is open per level
const activeByLevel = ref(new Map<number, string>());
provide(DROPDOWN_ACTIVE_KEY, activeByLevel);
</script>

<template>
  <template v-if="state.showTextMenuButtons">
    <!-- Compact mode: show dropdown with all text buttons -->
    <MenuDropdown v-if="useCompactMode" title="Text Formatting" placement="top">
      <template #button>
        <div class="wov-text-group-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            fill="currentColor"
            class="wov-text-group-icon"
          >
            <path
              d="M349.1 114.7C343.9 103.3 332.5 96 320 96C307.5 96 296.1 103.3 290.9 114.7L123.5 480L112 480C94.3 480 80 494.3 80 512C80 529.7 94.3 544 112 544L200 544C217.7 544 232 529.7 232 512C232 494.3 217.7 480 200 480L193.9 480L215.9 432L424.2 432L446.2 480L440.1 480C422.4 480 408.1 494.3 408.1 512C408.1 529.7 422.4 544 440.1 544L528.1 544C545.8 544 560.1 529.7 560.1 512C560.1 494.3 545.8 480 528.1 480L516.6 480L349.2 114.7zM394.8 368L245.2 368L320 204.8L394.8 368z"
            />
          </svg>
          <IconChevronDown class="wov-chevron-down" />
        </div>
      </template>

      <template #dropdown>
        <div class="wov-text-group-dropdown">
          <div class="wov-text-group-row wov-text-group-row-full">
            <TextFontFamilyButton :entityIds="entityIds" />
            <div class="wov-text-group-spacer" />
            <TextFontSizeButton :entityIds="entityIds" />
          </div>
          <div class="wov-text-group-row">
            <TextBoldButton :entityIds="entityIds" />
            <TextItalicButton :entityIds="entityIds" />
            <TextUnderlineButton :entityIds="entityIds" />
            <div class="wov-text-group-spacer" />
            <TextColorButton :entityIds="entityIds" />
            <TextAlignmentButton :entityIds="entityIds" />
            <VerticalAlignButton
              v-if="showVerticalAlign"
              :entityIds="entityIds"
            />
          </div>
        </div>
      </template>
    </MenuDropdown>

    <!-- Normal mode: show all buttons inline -->
    <template v-else>
      <TextFontFamilyButton :entityIds="entityIds" />
      <TextFontSizeButton :entityIds="entityIds" />
      <div divider class="wov-divider" />
      <TextBoldButton :entityIds="entityIds" />
      <TextItalicButton :entityIds="entityIds" />
      <TextUnderlineButton :entityIds="entityIds" />
      <div divider class="wov-divider" />
      <TextColorButton :entityIds="entityIds" />
      <TextAlignmentButton :entityIds="entityIds" />
      <VerticalAlignButton
        v-if="showVerticalAlign"
        :entityIds="entityIds"
      />
    </template>
  </template>
</template>

<style>
.wov-text-group-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 4px;
  padding: 0 12px;
}

.wov-text-group-icon {
  width: 18px;
  height: 18px;
}

.wov-text-group-dropdown {
  display: flex;
  flex-direction: column;
  background-color: var(--wov-gray-700);
  border-radius: 12px;
  padding: 8px;
  gap: 4px;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.wov-text-group-row {
  display: flex;
  align-items: center;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--wov-gray-600);
}

.wov-text-group-row > * {
  height: 100%;
}

.wov-text-group-row-full > *:not(.wov-text-group-spacer) {
  flex: 1;
}

.wov-text-group-row > *:hover:not(.wov-text-group-spacer) {
  background-color: var(--wov-gray-500);
}

.wov-text-group-spacer {
  width: 1px;
  height: 24px;
  margin: auto 4px;
  background-color: var(--wov-gray-500);
}
</style>
