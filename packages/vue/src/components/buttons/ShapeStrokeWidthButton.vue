<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@woven-canvas/core";
import { Shape } from "../../Shape";

import MenuDropdown from "./MenuDropdown.vue";
import { useComponents } from "../../composables/useComponents";
import { useEditorContext } from "../../composables/useEditorContext";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

const shapesMap = useComponents(() => props.entityIds, Shape);

// Get current stroke width
const currentWidth = computed<number>(() => {
  const first = shapesMap.value.values().next().value;
  return first?.strokeWidth ?? 2;
});

// Check if there are multiple different widths
const hasMultipleWidths = computed(() => {
  const widths = new Set<number>();
  for (const shape of shapesMap.value.values()) {
    if (shape) {
      widths.add(shape.strokeWidth);
    }
  }
  return widths.size > 1;
});

function handleWidthChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const newWidth = parseInt(target.value, 10);

  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId);
      shape.strokeWidth = newWidth;
    }
  });
}
</script>

<template>
  <MenuDropdown title="Stroke Width">
    <template #button>
      <div class="ic-stroke-width-button">
        <svg
          class="ic-stroke-width-icon"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          :stroke-width="Math.max(1, currentWidth / 2)"
        >
          <line x1="3" y1="10" x2="17" y2="10" stroke-linecap="round" />
        </svg>
        <span class="ic-stroke-width-value">{{
          hasMultipleWidths ? "–" : currentWidth
        }}</span>
      </div>
    </template>

    <template #dropdown>
      <div class="ic-stroke-width-dropdown">
        <div class="ic-stroke-width-label">Stroke Width</div>
        <div class="ic-stroke-width-slider-row">
          <input
            type="range"
            min="0"
            max="20"
            :value="currentWidth"
            class="ic-stroke-width-slider"
            @input="handleWidthChange"
          />
          <span class="ic-stroke-width-display">{{ currentWidth }}px</span>
        </div>
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.ic-stroke-width-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 6px;
  margin: 0 10px;
}

.ic-stroke-width-icon {
  width: 18px;
  height: 18px;
}

.ic-stroke-width-value {
  font-size: 12px;
  min-width: 16px;
  text-align: center;
}

.ic-stroke-width-dropdown {
  background: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
  padding: 12px 16px;
  min-width: 180px;
}

.ic-stroke-width-label {
  font-size: 12px;
  color: var(--ic-gray-300);
  margin-bottom: 8px;
}

.ic-stroke-width-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ic-stroke-width-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--ic-gray-500);
  border-radius: 2px;
  outline: none;
}

.ic-stroke-width-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.ic-stroke-width-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.ic-stroke-width-display {
  font-size: 12px;
  color: var(--ic-gray-100);
  min-width: 36px;
  text-align: right;
}
</style>
