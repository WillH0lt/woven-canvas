<script setup lang="ts">
import { computed, ref } from 'vue'
import { type EntityId, Shape, StrokeKind } from '@woven-canvas/core'

import MenuDropdown from './MenuDropdown.vue'
import ColorBubbles from './ColorBubbles.vue'
import StrokeStyleOptions from './StrokeStyleOptions.vue'
import IconChevronDown from '../icons/IconChevronDown.vue'
import { useComponents } from '../../composables/useComponents'
import { useEditorContext } from '../../composables/useEditorContext'
import { rgbToHex, type ColorData } from '../../utils/color'

const props = defineProps<{
  entityIds: EntityId[]
}>()

const { nextEditorTick, setDefaults } = useEditorContext()

const shapesMap = useComponents(() => props.entityIds, Shape)

const pickerOpen = ref(false)

// Get all selected stroke colors as hex values
const selectedColors = computed<string[]>(() => {
  const colorSet = new Set<string>()

  for (const shape of shapesMap.value.values()) {
    if (shape) {
      const hex = rgbToHex({
        red: shape.strokeRed,
        green: shape.strokeGreen,
        blue: shape.strokeBlue,
        alpha: 255,
      })
      colorSet.add(hex)
    }
  }

  return Array.from(colorSet)
})

// Check if there are multiple different colors
const hasMultipleColors = computed(() => selectedColors.value.length > 1)

// Get the first color for the swatch
const currentColorHex = computed(() => {
  return selectedColors.value[0] ?? '#000000'
})

// Get the current stroke style
const currentStyle = computed(() => {
  const first = shapesMap.value.values().next().value
  return first?.strokeKind ?? StrokeKind.Solid
})

// Check if multiple different styles are selected
const hasMultipleStyles = computed(() => {
  const styles = new Set<StrokeKind>()
  for (const shape of shapesMap.value.values()) {
    if (shape) {
      styles.add(shape.strokeKind)
    }
  }
  return styles.size > 1
})

function handleColorChange(color: ColorData) {
  // Remember the pick as the creation default for new shapes (mirrors setFontFamily).
  setDefaults('shape', { strokeRed: color.red, strokeGreen: color.green, strokeBlue: color.blue })
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId)
      shape.strokeRed = color.red
      shape.strokeGreen = color.green
      shape.strokeBlue = color.blue
    }
  })
}

function handleStyleChange(kind: StrokeKind) {
  setDefaults('shape', { strokeKind: kind })
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId)
      shape.strokeKind = kind
    }
  })
}

// Current stroke thickness (falls back to the component default).
const currentWidth = computed<number>(() => {
  const first = shapesMap.value.values().next().value
  return first?.strokeWidth ?? 2
})

function handleWidthChange(event: Event) {
  const target = event.target as HTMLInputElement
  const newWidth = parseInt(target.value, 10)
  setDefaults('shape', { strokeWidth: newWidth })
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId)
      shape.strokeWidth = newWidth
    }
  })
}
</script>

<template>
  <MenuDropdown title="Stroke Color">
    <template #button>
      <div class="wov-stroke-color-button">
        <svg viewBox="0 0 20 20" class="wov-stroke-color-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2.5 12.563c1.655-.886 5.9-3.293 8.568-4.355 2.668-1.062.101 2.822 1.32 3.105 1.218.283 5.112-1.814 5.112-1.814m-13.469 2.23c2.963-1.586 6.13-5.62 7.468-4.998 1.338.623-1.153 4.11-.132 5.595 1.02 1.487 6.133-1.43 6.133-1.43" stroke-width="1.25" />
        </svg>
        <IconChevronDown class="wov-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="wov-stroke-dropdown">
        <StrokeStyleOptions
          v-if="!pickerOpen"
          :currentStyle="currentStyle"
          :hasMultipleStyles="hasMultipleStyles"
          @change="handleStyleChange"
        />
        <div v-if="!pickerOpen" class="wov-stroke-thickness">
          <input
            type="range"
            min="1"
            max="20"
            :value="currentWidth"
            class="wov-stroke-thickness-slider"
            aria-label="Stroke thickness"
            @input="handleWidthChange"
          />
          <span class="wov-stroke-thickness-value">{{ currentWidth }}px</span>
        </div>
        <div v-if="!pickerOpen" class="wov-stroke-divider" />
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
.wov-stroke-color-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 6px;
  margin: 0 8px;
}

.wov-stroke-color-icon {
  width: 18px;
  height: 18px;
}

.wov-stroke-dropdown {
  display: flex;
  flex-direction: column;
}

.wov-stroke-divider {
  height: 1px;
  background: var(--wov-gray-600);
  margin: 0 8px;
}

.wov-stroke-thickness {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
}

.wov-stroke-thickness-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--wov-gray-500);
  border-radius: 2px;
  outline: none;
}

.wov-stroke-thickness-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.wov-stroke-thickness-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.wov-stroke-thickness-value {
  font-size: 12px;
  color: var(--wov-gray-100);
  min-width: 36px;
  text-align: right;
}
</style>
