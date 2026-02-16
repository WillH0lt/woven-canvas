<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@infinitecanvas/core";

import MenuDropdown from "../MenuDropdown.vue";
import IconChevronDown from "../../icons/IconChevronDown.vue";
import { useTextFormatting } from "../../../composables/useTextFormatting";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { state, commands } = useTextFormatting(() => props.entityIds);

const FONT_SIZE_OPTIONS = [
  { label: "Small", value: 16, displayValue: 10 },
  { label: "Medium", value: 24, displayValue: 12 },
  { label: "Large", value: 40, displayValue: 16 },
  { label: "Huge", value: 96, displayValue: 20 },
];

// Get current font size (null if mixed)
const currentFontSize = computed<number | null>(() => state.fontSize.value);

// Label for the button
const buttonLabel = computed(() => {
  const size = currentFontSize.value;
  if (size === null) return "Mixed";

  const option = FONT_SIZE_OPTIONS.find((o) => o.value === size);
  if (option) return option.label;

  return `${+size.toFixed(1)} px`;
});

// Display value for the input (shows current font size)
const inputDisplayValue = computed(() => {
  const size = currentFontSize.value;
  if (size === null) return "";
  return String(+size.toFixed(1));
});

function setFontSize(value: number) {
  commands.setFontSize(value);
}

function handleInputChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const value = Number.parseFloat(input.value);
  if (!Number.isNaN(value) && value > 0) {
    setFontSize(value);
  }
}

function handleInputKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    (e.target as HTMLInputElement).blur();
  }
}

function handleWheelStop(e: Event) {
  e.stopPropagation();
}
</script>

<template>
  <MenuDropdown title="Font Size">
    <template #button>
      <div class="ic-font-size-button">
        <span class="ic-font-size-label">{{ buttonLabel }}</span>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="ic-font-size-menu" @wheel="handleWheelStop" @click.stop>
        <div
          v-for="option in FONT_SIZE_OPTIONS"
          :key="option.value"
          class="ic-font-size-option"
          :class="{ active: currentFontSize === option.value }"
          @click="setFontSize(option.value)"
        >
          <svg
            v-if="currentFontSize === option.value"
            class="ic-check-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
            fill="currentColor"
          >
            <path
              d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"
            />
          </svg>
          <span
            class="ic-option-label"
            :style="{ fontSize: `${option.displayValue}px` }"
          >
            {{ option.label }}
          </span>
        </div>

        <div class="ic-separator" />

        <div class="ic-input-container">
          <input
            class="ic-custom-input"
            :value="inputDisplayValue"
            @input="handleInputChange"
            @keydown="handleInputKeyDown"
            placeholder="Custom size"
          />
          <span class="ic-px-suffix">px</span>
        </div>
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.ic-font-size-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  user-select: none;
  height: 100%;
  gap: 8px;
  padding: 0 12px;
}

.ic-font-size-label {
  font-size: 14px;
  white-space: nowrap;
}

.ic-font-size-menu {
  background-color: var(--ic-gray-700);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  border-radius: 8px;
  cursor: pointer;
  width: 150px;
}

.ic-font-size-menu > *:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.ic-font-size-option {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 32px;
  transition: background-color 0.2s;
}

.ic-font-size-option.active {
  background-color: var(--ic-primary);
}

.ic-font-size-option:not(.active):hover {
  background-color: var(--ic-gray-600);
}

.ic-check-icon {
  color: white;
  width: 16px;
  margin-right: 8px;
  margin-left: -24px;
}

.ic-option-label {
  color: white;
}

.ic-separator {
  margin: 4px 0;
  width: 100%;
  height: 0.75px;
  background-color: var(--ic-gray-600);
}

.ic-input-container {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
}

.ic-custom-input {
  background-color: var(--ic-gray-700);
  width: 100%;
  margin: 8px;
  border-radius: 6px;
  border: none;
  padding: 8px;
  color: white;
  font-size: 14px;
  outline: 1px solid var(--ic-gray-600);
}

.ic-custom-input:hover {
  outline: 1px solid var(--ic-gray-500);
}

.ic-custom-input:focus {
  outline: 2px solid var(--ic-primary);
}

.ic-px-suffix {
  position: absolute;
  right: 16px;
  color: var(--ic-gray-400);
  font-size: 14px;
}
</style>
