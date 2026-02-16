<script setup lang="ts">
import type { EntityId } from '@infinitecanvas/core'
import { useComponents, useEditorContext } from '@infinitecanvas/vue'
import { computed } from 'vue'
import { Shape } from '../Shape'

const props = defineProps<{
  entityIds: EntityId[]
}>()

const { nextEditorTick } = useEditorContext()

// Use useComponents to get Shape component for all selected entities
const shapesMap = useComponents(() => props.entityIds, Shape)

// Get current border value
const _currentBorder = computed<number>(() => {
  const first = shapesMap.value.values().next().value
  if (!first) return 5

  return first.border
})

// Check if there are multiple different border values
const _hasMultipleBorders = computed(() => {
  const values = new Set<number>()
  for (const shape of shapesMap.value.values()) {
    if (shape) {
      values.add(shape.border)
    }
  }
  return values.size > 1
})

function _handleBorderChange(event: Event) {
  const target = event.target as HTMLInputElement
  const newBorder = parseInt(target.value, 10)

  // Apply border to all selected entities
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId)
      shape.border = newBorder
    }
  })
}
</script>

<template>
  <MenuDropdown title="Border">
    <template #button>
      <div class="border-button">
        <svg
          class="border-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
        <span class="border-value">{{
          hasMultipleBorders ? "–" : currentBorder
        }}</span>
      </div>
    </template>

    <template #dropdown>
      <div class="border-dropdown">
        <div class="border-label">Border Width</div>
        <div class="border-slider-row">
          <input
            type="range"
            min="0"
            max="20"
            :value="currentBorder"
            class="border-slider"
            @input="handleBorderChange"
          />
          <span class="border-display">{{ currentBorder }}px</span>
        </div>
      </div>
    </template>
  </MenuDropdown>
</template>

<style scoped>
.border-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 6px;
  margin: 0 10px;
}

.border-icon {
  width: 18px;
  height: 18px;
}

.border-value {
  font-size: 12px;
  min-width: 16px;
  text-align: center;
}

.border-dropdown {
  background: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
  padding: 12px 16px;
  min-width: 180px;
  box-shadow: 0px 0px 0.5px rgba(0, 0, 0, 0.18), 0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
}

.border-label {
  font-size: 12px;
  color: var(--ic-gray-300);
  margin-bottom: 8px;
}

.border-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.border-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--ic-gray-500);
  border-radius: 2px;
  outline: none;
}

.border-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.border-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.border-display {
  font-size: 12px;
  color: var(--ic-gray-100);
  min-width: 36px;
  text-align: right;
}
</style>
