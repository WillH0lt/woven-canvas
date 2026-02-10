<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  modelValue: number;
  thumbColor: string;
  background?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

const sliderRef = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

function startDrag(e: PointerEvent) {
  isDragging.value = true;
  updatePosition(e);
  window.addEventListener("pointermove", updatePosition);
  window.addEventListener("pointerup", stopDrag);
}

function updatePosition(e: PointerEvent) {
  if (!sliderRef.value) return;
  const rect = sliderRef.value.getBoundingClientRect();
  const y = Math.max(
    0,
    Math.min(100, ((e.clientY - rect.top) / rect.height) * 100),
  );
  emit("update:modelValue", y);
}

function stopDrag() {
  isDragging.value = false;
  window.removeEventListener("pointermove", updatePosition);
  window.removeEventListener("pointerup", stopDrag);
}

defineExpose({ isDragging });
</script>

<template>
  <div
    ref="sliderRef"
    class="ic-color-slider"
    @pointerdown.prevent="startDrag"
  >
    <div v-if="background" class="ic-color-slider-gradient" :style="{ background }" />
    <div
      class="ic-color-slider-thumb"
      :style="{
        top: `${modelValue}%`,
        backgroundColor: thumbColor,
      }"
    />
  </div>
</template>

<style>
.ic-color-slider {
  width: 16px;
  height: 160px;
  border-radius: 6px;
  position: relative;
  cursor: pointer;
}

.ic-color-slider-gradient {
  position: absolute;
  inset: 0;
  border-radius: 6px;
}

.ic-color-slider-thumb {
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
