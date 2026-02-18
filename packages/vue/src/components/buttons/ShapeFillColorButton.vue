<script setup lang="ts">
import { computed, ref } from "vue";
import { type EntityId, Shape } from "@woven-canvas/core";

import MenuDropdown from "./MenuDropdown.vue";
import ColorBubbles from "./ColorBubbles.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useComponents } from "../../composables/useComponents";
import { useEditorContext } from "../../composables/useEditorContext";
import { rgbToHex, type ColorData } from "../../utils/color";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

const shapesMap = useComponents(() => props.entityIds, Shape);

// Fill opacity modes
type FillMode = "solid" | "faded" | "none";

const fillModes: { mode: FillMode; label: string; alpha: number }[] = [
  { mode: "solid", label: "Solid", alpha: 255 },
  { mode: "faded", label: "Faded", alpha: 128 },
  { mode: "none", label: "None", alpha: 0 },
];

// Get current fill mode based on alpha
const currentFillMode = computed<FillMode>(() => {
  const first = shapesMap.value.values().next().value;
  const alpha = first?.fillAlpha ?? 255;
  if (alpha === 0) return "none";
  if (alpha < 200) return "faded";
  return "solid";
});

// Check if multiple different modes are selected
const hasMultipleModes = computed(() => {
  const modes = new Set<FillMode>();
  for (const shape of shapesMap.value.values()) {
    if (shape) {
      const alpha = shape.fillAlpha ?? 255;
      if (alpha === 0) modes.add("none");
      else if (alpha < 200) modes.add("faded");
      else modes.add("solid");
    }
  }
  return modes.size > 1;
});

function handleModeChange(alpha: number) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId);
      shape.fillAlpha = alpha;
    }
  });
}

// Get all selected fill colors as hex8 values (includes alpha)
const selectedColors = computed<string[]>(() => {
  const colorSet = new Set<string>();

  for (const shape of shapesMap.value.values()) {
    if (shape) {
      const hex = rgbToHex({
        red: shape.fillRed,
        green: shape.fillGreen,
        blue: shape.fillBlue,
        alpha: shape.fillAlpha ?? 255,
      });
      colorSet.add(hex);
    }
  }

  return Array.from(colorSet);
});

// Check if there are multiple different colors
const hasMultipleColors = computed(() => selectedColors.value.length > 1);

// Get the first color for the swatch (hex8)
const currentColorHex = computed(() => {
  return selectedColors.value[0] ?? "#4a90d9";
});

function handleColorChange(color: ColorData) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId);
      shape.fillRed = color.red;
      shape.fillGreen = color.green;
      shape.fillBlue = color.blue;
      shape.fillAlpha = color.alpha;
    }
  });
}

// Track if picker is open
const pickerOpen = ref(false);
</script>

<template>
  <MenuDropdown title="Fill Color">
    <template #button>
      <div class="ic-fill-color-button">
        <svg viewBox="0 0 20 20" class="ic-fill-color-icon" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5.879,2.625L14.121,2.625C15.906,2.625 17.375,4.094 17.375,5.879L17.375,14.121C17.375,15.906 15.906,17.375 14.121,17.375L5.88,17.375C4.095,17.375 2.626,15.906 2.626,14.121L2.626,5.88C2.626,4.095 4.095,2.626 5.88,2.626L5.879,2.625Z" stroke-width="1.25"/>
          <path d="M2.779,14.655L14.543,2.871M10.238,17.308L17.318,10.229M2.876,9.577L9.853,2.6M5.397,17.239L17.16,5.476" stroke-width="1.25"/>
        </svg>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="ic-fill-dropdown">
        <div v-if="!pickerOpen" class="ic-fill-mode-section">
          <button
            v-for="option in fillModes"
            :key="option.mode"
            class="ic-fill-mode-option"
            :class="{
              'is-active': !hasMultipleModes && option.mode === currentFillMode,
            }"
            :title="option.label"
            @click="handleModeChange(option.alpha)"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="2"
                :fill="option.mode === 'none' ? 'none' : 'currentColor'"
                :fill-opacity="option.mode === 'faded' ? 0.4 : 1"
                :stroke="option.mode === 'none' ? 'currentColor' : 'none'"
                :stroke-width="option.mode === 'none' ? 1.5 : 0"
                :stroke-dasharray="option.mode === 'none' ? '3 3' : ''"
              />
            </svg>
            <span>{{ option.label }}</span>
          </button>
        </div>
        <ColorBubbles
          :currentColor="currentColorHex"
          :hideHighlight="hasMultipleColors"
          :withPicker="true"
          :withOpacity="true"
          @change="handleColorChange"
          @picker-open="pickerOpen = $event"
        />
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.ic-fill-color-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  margin: 0 8px;
}

.ic-fill-color-icon {
  width: 18px;
  height: 18px;
}

.ic-fill-dropdown {
  display: flex;
  flex-direction: column;
}

.ic-fill-mode-section {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  background-color: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius) var(--ic-menu-border-radius) 0 0;
  margin-bottom: -2px;
}

.ic-fill-mode-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  padding: 6px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0;
  color: var(--ic-gray-100);
  font-size: 11px;
}

.ic-fill-mode-option:first-child {
  border-top-left-radius: 8px;
}

.ic-fill-mode-option:last-child {
  border-top-right-radius: 8px;
}

.ic-fill-mode-option:hover {
  background: var(--ic-gray-600);
}

.ic-fill-mode-option.is-active {
  background: var(--ic-gray-600);
}

.ic-fill-mode-option svg {
  width: 24px;
  height: 24px;
}
</style>
