<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@infinitecanvas/editor";
import { Color } from "@infinitecanvas/editor";

import MenuDropdown from "./MenuDropdown.vue";
import ColorBubbles from "./ColorBubbles.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useComponents } from "../../composables/useComponents";
import { useEditorContext } from "../../composables/useEditorContext";
import { rgbToHex } from "../../utils/color";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

// Use useComponents at setup level (not inside computed)
const colorsMap = useComponents(() => props.entityIds, Color);

// Get all selected colors as hex values
const selectedColors = computed<string[]>(() => {
  const colorSet = new Set<string>();

  for (const color of colorsMap.value.values()) {
    if (color) {
      const colorHex = rgbToHex(color);
      colorSet.add(colorHex);
    }
  }

  return Array.from(colorSet);
});

// Check if there are multiple different colors
const hasMultipleColors = computed(() => selectedColors.value.length > 1);

// Get the first color for the swatch
const currentColorHex = computed(() => {
  return selectedColors.value[0] ?? null;
});

// Style for the swatch (gradient if multiple colors)
const swatchStyle = computed(() => {
  if (selectedColors.value.length === 0) return { backgroundColor: "#000" };

  if (selectedColors.value.length >= 2) {
    const c0 = selectedColors.value[0];
    const c1 = selectedColors.value[1];
    return {
      background: `linear-gradient(45deg, ${c0} 0%, ${c0} 50%, ${c1} 50%, ${c1} 100%)`,
    };
  }

  return { backgroundColor: selectedColors.value[0] };
});

function handleColorChange(colorHex: string) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      Color.fromHex(ctx, entityId, colorHex);
    }
  });
}
</script>

<template>
  <MenuDropdown title="Color">
    <template #button>
      <div class="ic-color-button">
        <div class="ic-color-swatch" :style="swatchStyle" />
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <ColorBubbles
        :currentColor="currentColorHex ?? undefined"
        :hideHighlight="hasMultipleColors"
        :withPicker="true"
        @change="handleColorChange"
      />
    </template>
  </MenuDropdown>
</template>

<style>
.ic-color-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  margin: 0 8px;
}

.ic-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  outline-style: solid;
  outline-width: 1px;
  outline-color: #ffffff55;
}

.ic-chevron-down {
  width: 4px;
  margin-bottom: 2px;
  color: var(--ic-gray-300);
}
</style>
