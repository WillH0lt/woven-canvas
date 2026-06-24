<script setup lang="ts">
import { computed } from 'vue'
import type { EntityId } from '@woven-canvas/core'
import { Color } from '@woven-canvas/core'

import MenuDropdown from './MenuDropdown.vue'
import ColorBubbles from './ColorBubbles.vue'
import IconChevronDown from '../icons/IconChevronDown.vue'
import { useComponents } from '../../composables/useComponents'
import { useEditorContext } from '../../composables/useEditorContext'
import { rgbToHex, type ColorData } from '../../utils/color'

const props = defineProps<{
  entityIds: EntityId[]
  /** Expose the opacity slider in the picker, writing the alpha byte of
   * `Color` (8-digit hex round-trips through `rgbToHex`/`Color.fromHex`). */
  withOpacity?: boolean
}>()

const { nextEditorTick } = useEditorContext()

// Use useComponents at setup level (not inside computed)
const colorsMap = useComponents(() => props.entityIds, Color)

// Get all selected colors as hex values
const selectedColors = computed<string[]>(() => {
  const colorSet = new Set<string>()

  for (const color of colorsMap.value.values()) {
    if (color) {
      const colorHex = rgbToHex(color)
      colorSet.add(colorHex)
    }
  }

  return Array.from(colorSet)
})

// Check if there are multiple different colors
const hasMultipleColors = computed(() => selectedColors.value.length > 1)

// Get the first color for the swatch
const currentColorHex = computed(() => {
  return selectedColors.value[0] ?? null
})

// Style for the swatch (gradient if multiple colors)
const swatchStyle = computed(() => {
  if (selectedColors.value.length === 0) return { backgroundColor: '#000' }

  if (selectedColors.value.length >= 2) {
    const c0 = selectedColors.value[0]
    const c1 = selectedColors.value[1]
    return {
      background: `linear-gradient(45deg, ${c0} 0%, ${c0} 50%, ${c1} 50%, ${c1} 100%)`,
    }
  }

  return { backgroundColor: selectedColors.value[0] }
})

function handleColorChange(color: ColorData) {
  const hex = rgbToHex(color)
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      Color.fromHex(ctx, entityId, hex)
    }
  })
}
</script>

<template>
  <MenuDropdown title="Color">
    <template #button>
      <div class="wov-color-button">
        <div class="wov-color-swatch">
          <div class="wov-color-swatch-fill" :style="swatchStyle" />
        </div>
        <IconChevronDown class="wov-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <ColorBubbles
        :currentColor="currentColorHex ?? undefined"
        :hideHighlight="hasMultipleColors"
        :withPicker="true"
        :withOpacity="withOpacity"
        @change="handleColorChange"
      />
    </template>
  </MenuDropdown>
</template>

<style>
.wov-color-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  margin: 0 8px;
}

.wov-color-swatch {
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  outline-style: solid;
  outline-width: 1px;
  outline-color: #ffffff55;
  overflow: hidden;
  /* Alpha checkerboard painted behind the swatch fill so a translucent color
   * reads as translucent (the grid shows through) instead of looking solid. */
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #c0c0c0 25%, transparent 25%),
    linear-gradient(-45deg, #c0c0c0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #c0c0c0 75%),
    linear-gradient(-45deg, transparent 75%, #c0c0c0 75%);
  background-size: 8px 8px;
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0;
}

.wov-color-swatch-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
</style>
