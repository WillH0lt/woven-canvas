<script setup lang="ts">
import { computed, ref } from "vue";
import ColorPicker from "./ColorPicker.vue";

const props = defineProps<{
  currentColor?: string;
  palette?: string[];
  hideHighlight?: boolean;
  withPicker?: boolean;
}>();

const emit = defineEmits<{
  change: [color: string];
}>();

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

// With picker: need odd palette count (palette + rainbow button = even total)
// Without picker: need even palette count
const colors = computed(() => {
  const palette = props.palette ?? defaultPalette;
  const needsOdd = props.withPicker;
  const isOdd = palette.length % 2 === 1;

  if (needsOdd && !isOdd) {
    // Remove last color to make it odd
    return palette.slice(0, -1);
  } else if (!needsOdd && isOdd) {
    // Remove last color to make it even
    return palette.slice(0, -1);
  }
  return palette;
});
const pickerOpen = ref(false);
const pickerColor = ref(props.currentColor ?? "#ff0000");

function colorsEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function isSelected(color: string): boolean {
  if (props.hideHighlight || !props.currentColor) return false;
  return colorsEqual(props.currentColor, color);
}

function isRainbowSelected(): boolean {
  if (props.hideHighlight || !props.currentColor) return false;
  return !colors.value.some((c) => colorsEqual(props.currentColor!, c));
}

function selectColor(color: string) {
  emit("change", color);
}

function togglePicker() {
  if (!pickerOpen.value && props.currentColor) {
    pickerColor.value = props.currentColor;
  }
  pickerOpen.value = !pickerOpen.value;
}

function onPickerChange(color: string) {
  pickerColor.value = color;
  emit("change", color);
}
</script>

<template>
  <div class="ic-color-bubbles-container">
    <ColorPicker
      v-if="pickerOpen"
      v-model="pickerColor"
      @update:model-value="onPickerChange"
    />
    <div v-else class="ic-color-bubbles">
      <div
        v-for="color in colors"
        :key="color"
        class="ic-color-bubble"
        :class="{ selected: isSelected(color) }"
        :style="{ backgroundColor: color }"
        @mousedown.prevent
        @click="selectColor(color)"
      />
      <div
        v-if="withPicker"
        class="ic-color-bubble ic-rainbow-bubble"
        :class="{ selected: isRainbowSelected() }"
        @mousedown.prevent
        @click="togglePicker"
      />
    </div>
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

.ic-rainbow-bubble {
  background: radial-gradient(50% 50% at 50% 50%, #ffffff 0%, transparent 100%),
    conic-gradient(
      from 0deg at 50% 50%,
      red,
      #ffa800 47.73deg,
      #ff0 79.56deg,
      #0f0 121.33deg,
      #0ff 180.99deg,
      #00f 238.67deg,
      #f0f 294.36deg,
      red 360deg
    ),
    #c4c4c4;
}
</style>
