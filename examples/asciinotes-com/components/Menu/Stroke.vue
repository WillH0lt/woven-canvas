<template>
  <div
    class="w-fit p-3 rounded-xl bg-gray-700 cursor-auto"
    v-on-click-outside="() => $emit('blur')"
  >
    <MenuColorPicker v-if="colorPickerVisible" v-model="color" />
    <div v-else class="flex flex-col gap-2">
      <div class="text-gray-400 text-xs">Stroke Style</div>
      <div class="w-full flex gap-2 justify-center">
        <div
          v-for="strokeKind of strokeKinds"
          class="w-8 aspect-square p-2 rounded-lg bg-gray-500 cursor-pointer transition-colors"
          :class="{ 'bg-primary': kind === strokeKind, 'hover:bg-gray-400': kind !== strokeKind }"
          @click="kind = strokeKind"
        >
          <component :is="strokeKindIcons[strokeKind]" class="w-4" />
        </div>
      </div>

      <div class="text-gray-400 text-xs translate-y-2">Stroke Width</div>
      <ElementSlider v-model="width" :min="1" :max="20" @blur="$emit('blur')" />

      <div class="text-gray-400 text-xs translate-y-2">Sloppiness</div>
      <ElementSlider v-model="roughness" :min="0" :max="10" @blur="$emit('blur')" />

      <div class="text-gray-400 text-xs">Stroke Color</div>

      <MenuColorBubbles v-model="color" @show-picker="colorPickerVisible = true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';
import { ShapeStrokeKind } from '@prisma/client';

const emit = defineEmits<{
  (e: 'blur'): void;
}>();

const color = defineModel<string>('color', { required: true });
const kind = defineModel<ShapeStrokeKind>('kind', { required: true });
const roughness = defineModel<number>('roughness', { required: true });
const width = defineModel<number>('width', { required: true });

const strokeKinds = [
  ShapeStrokeKind.Solid,
  ShapeStrokeKind.Dashed,
  ShapeStrokeKind.Dotted,
  ShapeStrokeKind.None,
];
const strokeKindIcons = {
  [ShapeStrokeKind.Solid]: 'SvgoSolidLine',
  [ShapeStrokeKind.Dotted]: 'SvgoDottedLine',
  [ShapeStrokeKind.Dashed]: 'SvgoDashedLine',
  [ShapeStrokeKind.None]: 'SvgoBan',
};

const colorPickerVisible = ref(false);

onUnmounted(() => {
  emit('blur');
});
</script>
