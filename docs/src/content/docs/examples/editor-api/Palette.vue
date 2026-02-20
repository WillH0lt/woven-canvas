<script setup lang="ts">
import { defineQuery, Shape } from '@woven-canvas/core'
import { useEditorContext } from '@woven-canvas/vue'

const { nextEditorTick } = useEditorContext()

const shapesQuery = defineQuery((q) => q.with(Shape))

const colors = [
  { name: 'Red', r: 220, g: 53, b: 69 },
  { name: 'Green', r: 40, g: 167, b: 69 },
  { name: 'Blue', r: 0, g: 123, b: 255 },
  { name: 'Yellow', r: 255, g: 193, b: 7 },
  { name: 'Purple', r: 111, g: 66, b: 193 },
]

function setAllColors(r: number, g: number, b: number) {
  nextEditorTick((ctx) => {
    for (const entityId of shapesQuery.current(ctx)) {
      const shape = Shape.write(ctx, entityId)
      shape.fillRed = r
      shape.fillGreen = g
      shape.fillBlue = b
      shape.fillAlpha = 200
    }
  })
}
</script>

<template>
  <div class="palette">
    <button
      v-for="color in colors"
      :key="color.name"
      :style="{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }"
      @click="setAllColors(color.r, color.g, color.b)"
    >
      {{ color.name }}
    </button>
  </div>
</template>

<style scoped>
.palette {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.palette button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: transform 0.1s, box-shadow 0.1s;
}

.palette button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.palette button:active {
  transform: translateY(0);
}
</style>
