<script setup lang="ts">
import { computed, ref } from "vue";
import type { EntityId } from "@infinitecanvas/editor";
import { Text } from "@infinitecanvas/editor";

import MenuDropdown from "../MenuDropdown.vue";
import IconChevronDown from "../../../icons/IconChevronDown.vue";
import { useComponents } from "../../../composables/useComponents";
import { useEditorContext } from "../../../composables/useEditorContext";

export interface FontOption {
  name: string;
  displayName: string;
  previewImage?: string;
}

const props = withDefaults(
  defineProps<{
    entityIds: EntityId[];
    fonts?: FontOption[];
    showSearch?: boolean;
  }>(),
  {
    fonts: () => [
      { name: "Figtree", displayName: "Figtree" },
      { name: "Inter", displayName: "Inter" },
      { name: "Roboto", displayName: "Roboto" },
      { name: "Open Sans", displayName: "Open Sans" },
      { name: "Lato", displayName: "Lato" },
      { name: "Montserrat", displayName: "Montserrat" },
      { name: "Playfair Display", displayName: "Playfair Display" },
      { name: "Merriweather", displayName: "Merriweather" },
    ],
    showSearch: false,
  }
);

const { nextEditorTick } = useEditorContext();

// Get Text components for all selected entities
const textsMap = useComponents(() => props.entityIds, Text);

// Get current font family (null if mixed)
const currentFontFamily = computed<string | null>(() => {
  let fontFamily: string | null = null;

  for (const text of textsMap.value.values()) {
    if (!text) continue;

    if (fontFamily === null) {
      fontFamily = text.fontFamily;
    } else if (fontFamily !== text.fontFamily) {
      return null; // Mixed fonts
    }
  }

  return fontFamily;
});

// Label for the button
const buttonLabel = computed(() => {
  const family = currentFontFamily.value;
  if (family === null) return "Mixed";

  const font = props.fonts.find((f) => f.name === family);
  return font?.displayName ?? family;
});

// Search
const searchText = ref("");

const filteredFonts = computed(() => {
  if (!searchText.value) return props.fonts;
  const search = searchText.value.toLowerCase();
  return props.fonts.filter(
    (f) =>
      f.name.toLowerCase().includes(search) ||
      f.displayName.toLowerCase().includes(search)
  );
});

function setFontFamily(fontName: string) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const text = Text.write(ctx, entityId);
      text.fontFamily = fontName;
    }
  });
}

function handleSearchInput(e: Event) {
  const input = e.target as HTMLInputElement;
  searchText.value = input.value;
}

function handleWheelStop(e: Event) {
  e.stopPropagation();
}
</script>

<template>
  <MenuDropdown title="Font Family">
    <template #button>
      <div class="ic-font-family-button">
        <span class="ic-font-family-label">{{ buttonLabel }}</span>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown="{ close }">
      <div class="ic-font-family-menu" @wheel="handleWheelStop" @click.stop>
        <div class="ic-font-list">
          <div
            v-for="font in filteredFonts"
            :key="font.name"
            class="ic-font-item"
            :class="{ active: currentFontFamily === font.name }"
            @click="setFontFamily(font.name); close()"
          >
            <img
              v-if="font.previewImage"
              class="ic-font-preview"
              :src="font.previewImage"
              :alt="font.name"
            />
            <span v-else class="ic-font-name" :style="{ fontFamily: font.name }">
              {{ font.displayName }}
            </span>
          </div>
        </div>

        <template v-if="showSearch">
          <div class="ic-separator" />

          <div class="ic-search-container">
            <svg
              class="ic-search-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              class="ic-search-input"
              :value="searchText"
              @input="handleSearchInput"
              placeholder="Search"
            />
          </div>
        </template>
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

.ic-chevron-down {
  width: 4px;
  margin-bottom: 2px;
  color: var(--ic-gray-300);
}

.ic-font-family-menu {
  background-color: var(--ic-gray-700);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
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
  padding: 8px 12px;
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
  height: 100%;
  overflow: hidden;
  object-fit: cover;
  object-position: left;
}

.ic-font-name {
  font-size: 14px;
}

.ic-separator {
  margin: 4px 0;
  width: 100%;
  height: 0.75px;
  background-color: var(--ic-gray-600);
}

.ic-search-container {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 100%;
  color: white;
}

.ic-search-icon {
  position: absolute;
  left: 16px;
  width: 16px;
  height: 16px;
  color: var(--ic-gray-300);
}

.ic-search-input {
  background-color: var(--ic-gray-700);
  width: 100%;
  padding-left: 32px;
  margin: 8px;
  border-radius: 6px;
  border: none;
  padding-top: 8px;
  padding-bottom: 8px;
  color: white;
  outline: 1px solid var(--ic-gray-600);
}

.ic-search-input:hover {
  outline: 1px solid var(--ic-gray-500);
}

.ic-search-input:focus {
  outline: 2px solid var(--ic-primary);
}
</style>
