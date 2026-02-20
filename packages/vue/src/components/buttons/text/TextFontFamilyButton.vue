<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@woven-canvas/core";

import MenuDropdown from "../MenuDropdown.vue";
import IconChevronDown from "../../icons/IconChevronDown.vue";
import { useTextFormatting } from "../../../composables/useTextFormatting";
import { useFonts } from "../../../composables/useFonts";

export interface FontOption {
  name: string;
  displayName: string;
  previewImage?: string;
}

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { state, commands } = useTextFormatting(() => props.entityIds);

// Get fonts from editor (filtered to selectable only)
const editorFonts = useFonts();

// Map editor fonts to FontOption format, use props.fonts as override
const resolvedFonts = computed<FontOption[]>(() => {
  return editorFonts.value.map((font) => ({
    name: font.name,
    displayName: font.displayName,
    previewImage: font.previewImage,
  }));
});

// Get current font family (null if mixed)
const currentFontFamily = computed<string | null>(() => state.fontFamily);

// Label for the button
const buttonLabel = computed(() => {
  const family = currentFontFamily.value;
  if (family === null) return "Mixed";

  const font = resolvedFonts.value.find((f) => f.name === family);
  return font?.displayName ?? family;
});

function setFontFamily(fontName: string) {
  commands.setFontFamily(fontName);
}

function handleWheelStop(e: Event) {
  e.stopPropagation();
}
</script>

<template>
  <MenuDropdown v-if="state.showTextMenuButtons" title="Font Family">
    <template #button>
      <div class="ic-font-family-button">
        <span class="ic-font-family-label">{{ buttonLabel }}</span>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="ic-font-family-menu" @wheel="handleWheelStop" @click.stop>
        <div class="ic-font-list">
          <div
            v-for="font in resolvedFonts"
            :key="font.name"
            class="ic-font-item"
            :class="{ active: currentFontFamily === font.name }"
            @click="setFontFamily(font.name)"
          >
            <img
              v-if="font.previewImage"
              class="ic-font-preview"
              :src="font.previewImage"
              :alt="font.name"
            />
            <span
              v-else
              class="ic-font-name"
              :style="{ fontFamily: font.name }"
            >
              {{ font.displayName }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.ic-font-family-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  user-select: none;
  height: 100%;
  gap: 8px;
  padding: 0 12px;
}

.ic-font-family-label {
  font-size: 14px;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ic-font-family-menu {
  background-color: var(--ic-gray-700);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  border-radius: 8px;
  cursor: default;
  width: 200px;
}

.ic-font-list {
  max-height: 200px;
  color: white;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 8px;
}

.ic-font-list > *:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.ic-font-list > *:last-child {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.ic-font-item {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0px 12px;
  width: 100%;
  transition: background-color 0.2s;
  cursor: pointer;
}

.ic-font-item.active {
  background-color: var(--ic-primary);
}

.ic-font-item:not(.active):hover {
  background-color: var(--ic-gray-600);
}

.ic-font-preview {
  filter: invert(1);
  height: 50%;
  overflow: hidden;
  object-fit: cover;
  object-position: left;
}

.ic-font-name {
  font-size: 14px;
}
</style>
