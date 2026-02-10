<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  hexToHsva,
  hsvToHex,
  hsvaToHex,
  type HSVAColor,
} from "../../utils/color";
import ColorInput from "./ColorInput.vue";
import ColorSlider from "./ColorSlider.vue";

const props = defineProps<{
  modelValue?: string;
  withOpacity?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [color: string];
}>();

// Slider refs for checking drag state
const hueSliderRef = ref<InstanceType<typeof ColorSlider> | null>(null);
const opacitySliderRef = ref<InstanceType<typeof ColorSlider> | null>(null);

// Color picker state
const selectorRef = ref<HTMLDivElement | null>(null);
const selectorPosition = ref({ x: 100, y: 0 });
const huePosition = ref(0);
const opacityPosition = ref(0);
const isDraggingSelector = ref(false);

// Check if any slider is being dragged
const isDragging = computed(
  () =>
    isDraggingSelector.value ||
    hueSliderRef.value?.isDragging ||
    opacitySliderRef.value?.isDragging,
);

// Computed HSVA from positions
const currentHsva = computed<HSVAColor>(() => ({
  h: (huePosition.value / 100) * 360,
  s: selectorPosition.value.x,
  v: 100 - selectorPosition.value.y,
  a: ((100 - opacityPosition.value) / 100) * 255,
}));

const trackHueColor = computed(() =>
  hsvToHex({ h: currentHsva.value.h, s: 100, v: 100 }),
);

// RGB color without alpha for display
const pickedColorRgb = computed(() =>
  hsvToHex({
    h: currentHsva.value.h,
    s: currentHsva.value.s,
    v: currentHsva.value.v,
  }),
);

// Full color with alpha
const pickedColor = computed(() =>
  props.withOpacity ? hsvaToHex(currentHsva.value) : pickedColorRgb.value,
);

// Hue track gradient (static)
const hueGradient =
  "linear-gradient(to bottom, red 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, red 100%)";

// Opacity gradient (dynamic based on picked color)
const opacityGradient = computed(
  () => `linear-gradient(to top, transparent 0%, ${pickedColorRgb.value} 100%)`,
);

// Initialize positions from modelValue (supports hex6 and hex8)
function initFromColor(color: string | undefined) {
  if (color) {
    const hsva = hexToHsva(color);
    selectorPosition.value = { x: hsva.s, y: 100 - hsva.v };
    huePosition.value = (hsva.h / 360) * 100;
    opacityPosition.value = 100 - (hsva.a / 255) * 100;
  }
}

// Handle hex input change
function handleHexInput(color: string) {
  initFromColor(color);
  emit(
    "update:modelValue",
    props.withOpacity ? hsvaToHex(hexToHsva(color)) : color,
  );
}

// Initialize on mount
initFromColor(props.modelValue);

// Watch for external changes
watch(
  () => props.modelValue,
  (newColor) => {
    if (!isDragging.value) {
      initFromColor(newColor);
    }
  },
);

// Emit color change while dragging
watch([selectorPosition, huePosition, opacityPosition], () => {
  if (isDragging.value) {
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
    Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
  );
  const y = Math.max(
    0,
    Math.min(100, ((e.clientY - rect.top) / rect.height) * 100),
  );
  selectorPosition.value = { x, y };
}

function stopSelectorDrag() {
  isDraggingSelector.value = false;
  window.removeEventListener("pointermove", updateSelectorPosition);
  window.removeEventListener("pointerup", stopSelectorDrag);
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
        @pointerdown.prevent="startSelectorDrag"
      >
        <div class="ic-color-picker-selector-gradient">
          <div
            class="ic-color-picker-selector-thumb"
            :style="{
              left: `${selectorPosition.x}%`,
              top: `${selectorPosition.y}%`,
              backgroundColor: pickedColorRgb,
            }"
          />
        </div>
      </div>
      <ColorSlider
        ref="hueSliderRef"
        v-model="huePosition"
        :thumbColor="trackHueColor"
        :background="hueGradient"
      />
      <ColorSlider
        v-if="withOpacity"
        ref="opacitySliderRef"
        v-model="opacityPosition"
        :thumbColor="pickedColorRgb"
        :background="opacityGradient"
        class="ic-color-picker-opacity"
      />
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
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
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
  background-image:
    linear-gradient(to top, #000 0%, rgba(0, 0, 0, 0) 100%),
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

.ic-color-picker-opacity {
  background-image:
    linear-gradient(45deg, #808080 25%, transparent 25%),
    linear-gradient(-45deg, #808080 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #808080 75%),
    linear-gradient(-45deg, transparent 75%, #808080 75%);
  background-size: 8px 8px;
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0px;
  background-color: #404040;
}
</style>
