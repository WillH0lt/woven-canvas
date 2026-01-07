<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  currentColor?: string;
  palette?: string[];
  hideHighlight?: boolean;
}>();

const emit = defineEmits<{
  change: [color: string];
}>();

// Default color palette
const defaultPalette = [
  "#000000",
  "#374151",
  "#6B7280",
  "#9CA3AF",
  "#D1D5DB",
  "#FFFFFF",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

const colors = computed(() => props.palette ?? defaultPalette);

function colorsEqual(a: string, b: string): boolean {
  // Simple hex comparison (normalize to lowercase)
  return a.toLowerCase() === b.toLowerCase();
}

function isSelected(color: string): boolean {
  if (props.hideHighlight || !props.currentColor) return false;
  return colorsEqual(props.currentColor, color);
}

function selectColor(color: string) {
  emit("change", color);
}
</script>

<template>
  <div class="ic-color-bubbles">
    <div
      v-for="color in colors"
      :key="color"
      class="ic-color-bubble"
      :class="{ selected: isSelected(color) }"
      :style="{ backgroundColor: color }"
      @click="selectColor(color)"
    />
  </div>
</template>

<style>
.ic-color-bubbles {
  color: var(--ic-gray-100);
  background-color: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
  box-shadow: 0px 0px 0.5px rgba(0, 0, 0, 0.18), 0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  justify-content: center;
}

.ic-color-bubble {
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  outline-style: solid;
  outline-width: 1px;
  outline-color: #ffffff55;
  cursor: pointer;
}

.ic-color-bubble.selected {
  outline-width: 2px;
  outline-color: var(--ic-primary);
  outline-offset: 2px;
}
</style>
