<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { hexToHsv, hsvToHex, type HSVColor } from "../../utils/color";
import ColorInput from "./ColorInput.vue";

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [color: string];
}>();

// Color picker state
const selectorRef = ref<HTMLDivElement | null>(null);
const trackRef = ref<HTMLDivElement | null>(null);
const selectorPosition = ref({ x: 100, y: 0 });
const trackPosition = ref({ y: 0 });
const isDraggingSelector = ref(false);
const isDraggingTrack = ref(false);

// Computed HSV from positions
const currentHsv = computed<HSVColor>(() => ({
  h: (trackPosition.value.y / 100) * 360,
  s: selectorPosition.value.x,
  v: 100 - selectorPosition.value.y,
}));

const trackHueColor = computed(() =>
  hsvToHex({ h: currentHsv.value.h, s: 100, v: 100 })
);

const pickedColor = computed(() => hsvToHex(currentHsv.value));

// Initialize positions from modelValue
function initFromColor(color: string | undefined) {
  if (color) {
    const hsv = hexToHsv(color);
    selectorPosition.value = { x: hsv.s, y: 100 - hsv.v };
    trackPosition.value = { y: (hsv.h / 360) * 100 };
  }
}

// Handle hex input change
function handleHexInput(color: string) {
  initFromColor(color);
  emit("update:modelValue", color);
}

// Initialize on mount
initFromColor(props.modelValue);

// Watch for external changes
watch(
  () => props.modelValue,
  (newColor) => {
    if (!isDraggingSelector.value && !isDraggingTrack.value) {
      initFromColor(newColor);
    }
  }
);

// Emit color change while dragging
watch([selectorPosition, trackPosition], () => {
  if (isDraggingSelector.value || isDraggingTrack.value) {
    emit("update:modelValue", pickedColor.value);
  }
});

// Selector dragging
function startSelectorDrag(e: PointerEvent) {
  isDraggingSelector.value = true;
  updateSelectorPosition(e);
  window.addEventListener("pointermove", updateSelectorPosition);
  window.addEventListener("pointerup", stopSelectorDrag);
}

function updateSelectorPosition(e: PointerEvent) {
  if (!selectorRef.value) return;
  const rect = selectorRef.value.getBoundingClientRect();
  const x = Math.max(
    0,
    Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
  );
  const y = Math.max(
    0,
    Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
  );
  selectorPosition.value = { x, y };
}

function stopSelectorDrag() {
  isDraggingSelector.value = false;
  window.removeEventListener("pointermove", updateSelectorPosition);
  window.removeEventListener("pointerup", stopSelectorDrag);
}

// Track dragging
function startTrackDrag(e: PointerEvent) {
  isDraggingTrack.value = true;
  updateTrackPosition(e);
  window.addEventListener("pointermove", updateTrackPosition);
  window.addEventListener("pointerup", stopTrackDrag);
}

function updateTrackPosition(e: PointerEvent) {
  if (!trackRef.value) return;
  const rect = trackRef.value.getBoundingClientRect();
  const y = Math.max(
    0,
    Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
  );
  trackPosition.value = { y };
}

function stopTrackDrag() {
  isDraggingTrack.value = false;
  window.removeEventListener("pointermove", updateTrackPosition);
  window.removeEventListener("pointerup", stopTrackDrag);
}
</script>

<template>
  <div class="ic-color-picker">
    <ColorInput :modelValue="pickedColor" @update:modelValue="handleHexInput" />
    <div class="ic-color-picker-area">
      <div
        ref="selectorRef"
        class="ic-color-picker-selector"
        :style="{ backgroundColor: trackHueColor }"
        @pointerdown="startSelectorDrag"
      >
        <div class="ic-color-picker-selector-gradient">
          <div
            class="ic-color-picker-selector-thumb"
            :style="{
              left: `${selectorPosition.x}%`,
              top: `${selectorPosition.y}%`,
              backgroundColor: pickedColor,
            }"
          />
        </div>
      </div>
      <div ref="trackRef" class="ic-color-picker-track" @pointerdown="startTrackDrag">
        <div
          class="ic-color-picker-track-thumb"
          :style="{
            top: `${trackPosition.y}%`,
            backgroundColor: trackHueColor,
          }"
        />
      </div>
    </div>
  </div>
</template>

<style>
.ic-color-picker {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  background-color: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
  box-shadow: 0px 0px 0.5px rgba(0, 0, 0, 0.18), 0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
  padding: 8px;
}

.ic-color-picker-area {
  display: flex;
  gap: 8px;
}

.ic-color-picker-selector {
  width: 160px;
  height: 160px;
  border-radius: 6px;
  position: relative;
  cursor: crosshair;
}

.ic-color-picker-selector-gradient {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background-image: linear-gradient(to top, #000 0%, rgba(0, 0, 0, 0) 100%),
    linear-gradient(to right, #fff 0%, rgba(255, 255, 255, 0) 100%);
}

.ic-color-picker-selector-thumb {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border: 2px solid white;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.ic-color-picker-track {
  width: 16px;
  height: 160px;
  border-radius: 6px;
  position: relative;
  cursor: pointer;
  background-image: linear-gradient(
    0deg,
    red 0%,
    #f0f 17%,
    #00f 33%,
    #0ff 50%,
    #0f0 67%,
    #ff0 83%,
    red 100%
  );
}

.ic-color-picker-track-thumb {
  position: absolute;
  left: 50%;
  width: 16px;
  height: 8px;
  border-radius: 4px;
  border: 2px solid white;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
</style>
