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
      <div class="wov-font-family-button">
        <span class="wov-font-family-label">{{ buttonLabel }}</span>
        <IconChevronDown class="wov-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="wov-font-family-menu" @wheel="handleWheelStop" @click.stop>
        <div class="wov-font-list">
          <div
            v-for="font in resolvedFonts"
            :key="font.name"
            class="wov-font-item"
            :class="{ active: currentFontFamily === font.name }"
            @click="setFontFamily(font.name)"
          >
            <img
              v-if="font.previewImage"
              class="wov-font-preview"
              :src="font.previewImage"
              :alt="font.name"
            />
            <span
              v-else
              class="wov-font-name"
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
.wov-font-family-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  user-select: none;
  height: 100%;
  gap: 8px;
  padding: 0 12px;
}

.wov-font-family-label {
  font-size: 14px;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wov-font-family-menu {
  background-color: var(--wov-gray-700);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  border-radius: 8px;
  cursor: default;
  width: 200px;
}

.wov-font-list {
  max-height: 200px;
  color: white;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 8px;
}

.wov-font-list > *:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.wov-font-list > *:last-child {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.wov-font-item {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0px 12px;
  width: 100%;
  transition: background-color 0.2s;
  cursor: pointer;
}

.wov-font-item.active {
  background-color: var(--wov-primary);
}

.wov-font-item:not(.active):hover {
  background-color: var(--wov-gray-600);
}

.wov-font-preview {
  filter: invert(1);
  height: 50%;
  overflow: hidden;
  object-fit: cover;
  object-position: left;
}

.wov-font-name {
  font-size: 14px;
}
</style>
