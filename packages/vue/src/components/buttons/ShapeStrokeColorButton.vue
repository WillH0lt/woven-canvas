<script setup lang="ts">
import { computed, ref } from "vue";
import type { EntityId } from "@woven-canvas/core";
import { Shape, StrokeKind } from "@woven-canvas/plugin-shapes";

import MenuDropdown from "./MenuDropdown.vue";
import ColorBubbles from "./ColorBubbles.vue";
import StrokeStyleOptions from "./StrokeStyleOptions.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useComponents } from "../../composables/useComponents";
import { useEditorContext } from "../../composables/useEditorContext";
import { rgbToHex, type ColorData } from "../../utils/color";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

const shapesMap = useComponents(() => props.entityIds, Shape);

const pickerOpen = ref(false);

// Get all selected stroke colors as hex values
const selectedColors = computed<string[]>(() => {
  const colorSet = new Set<string>();

  for (const shape of shapesMap.value.values()) {
    if (shape) {
      const hex = rgbToHex({
        red: shape.strokeRed,
        green: shape.strokeGreen,
        blue: shape.strokeBlue,
        alpha: 255,
      });
      colorSet.add(hex);
    }
  }

  return Array.from(colorSet);
});

// Check if there are multiple different colors
const hasMultipleColors = computed(() => selectedColors.value.length > 1);

// Get the first color for the swatch
const currentColorHex = computed(() => {
  return selectedColors.value[0] ?? "#000000";
});

// Get the current stroke style
const currentStyle = computed(() => {
  const first = shapesMap.value.values().next().value;
  return first?.strokeKind ?? StrokeKind.Solid;
});

// Check if multiple different styles are selected
const hasMultipleStyles = computed(() => {
  const styles = new Set<StrokeKind>();
  for (const shape of shapesMap.value.values()) {
    if (shape) {
      styles.add(shape.strokeKind);
    }
  }
  return styles.size > 1;
});

function handleColorChange(color: ColorData) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId);
      shape.strokeRed = color.red;
      shape.strokeGreen = color.green;
      shape.strokeBlue = color.blue;
    }
  });
}

function handleStyleChange(kind: StrokeKind) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId);
      shape.strokeKind = kind;
    }
  });
}
</script>

<template>
  <MenuDropdown title="Stroke Color">
    <template #button>
      <div class="ic-stroke-color-button">
        <svg viewBox="0 0 20 20" class="ic-stroke-color-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2.5 12.563c1.655-.886 5.9-3.293 8.568-4.355 2.668-1.062.101 2.822 1.32 3.105 1.218.283 5.112-1.814 5.112-1.814m-13.469 2.23c2.963-1.586 6.13-5.62 7.468-4.998 1.338.623-1.153 4.11-.132 5.595 1.02 1.487 6.133-1.43 6.133-1.43" stroke-width="1.25" />
        </svg>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="ic-stroke-dropdown">
        <StrokeStyleOptions
          v-if="!pickerOpen"
          :currentStyle="currentStyle"
          :hasMultipleStyles="hasMultipleStyles"
          @change="handleStyleChange"
        />
        <div v-if="!pickerOpen" class="ic-stroke-divider" />
        <ColorBubbles
          :currentColor="currentColorHex"
          :hideHighlight="hasMultipleColors"
          :withPicker="true"
          @change="handleColorChange"
          @picker-open="pickerOpen = $event"
        />
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.ic-stroke-color-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 6px;
  margin: 0 8px;
}

.ic-stroke-color-icon {
  width: 18px;
  height: 18px;
}

.ic-stroke-dropdown {
  display: flex;
  flex-direction: column;
}

.ic-stroke-divider {
  height: 1px;
  background: var(--ic-gray-600);
  margin: 0 8px;
}
</style>
