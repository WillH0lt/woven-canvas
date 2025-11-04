<template>
  <div
    class="w-fit p-3 rounded-xl bg-gray-700 cursor-auto"
    v-on-click-outside="() => $emit('blur')"
  >
    <MenuColorPicker v-if="colorPickerVisible" v-model="color" />
    <div v-else class="flex flex-col gap-2">
      <div class="text-gray-400 text-xs">Fill Style</div>
      <div class="w-full flex gap-2 justify-center">
        <div
          v-for="fillKind of fillKinds"
          class="w-8 aspect-square p-2 rounded-lg bg-gray-500 cursor-pointer transition-colors"
          :class="{ 'bg-primary': kind === fillKind, 'hover:bg-gray-400': kind !== fillKind }"
          @click="kind = fillKind"
        >
          <component :is="fillKindIcons[fillKind]" class="w-4" />
        </div>
      </div>

      <template v-if="isHatchure">
        <div class="text-gray-400 text-xs translate-y-2">Stroke Width</div>
        <ElementSlider v-model="width" :min="1" :max="20" @blur="$emit('blur')" />

        <div class="text-gray-400 text-xs translate-y-2">Hachure Gap</div>
        <ElementSlider v-model="gap" :min="5" :max="60" @blur="$emit('blur')" />

        <div class="text-gray-400 text-xs translate-y-2">Hachure Angle</div>
        <ElementSlider v-model="angle" :min="0" :max="180" @blur="$emit('blur')" />
      </template>

      <div class="text-gray-400 text-xs">Fill Color</div>

      <MenuColorBubbles v-model="color" @show-picker="colorPickerVisible = true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';
import { ShapeFillKind } from '@prisma/client';

const emit = defineEmits<{
  (e: 'blur'): void;
}>();

const color = defineModel<string>('color', { required: true });
const kind = defineModel<ShapeFillKind>('kind', { required: true });
const width = defineModel<number>('width', { required: true });
const gap = defineModel<number>('hatchureGap', { required: true });
const angle = defineModel<number>('hatchureAngle', { required: true });

const fillKinds = [
  ShapeFillKind.Solid,
  ShapeFillKind.Hatchure,
  ShapeFillKind.CrossHatch,
  ShapeFillKind.None,
];
const fillKindIcons = {
  [ShapeFillKind.Solid]: 'SvgoSolidFill',
  [ShapeFillKind.Hatchure]: 'SvgoHatchureFill',
  [ShapeFillKind.CrossHatch]: 'SvgoCrosshatchFill',
  [ShapeFillKind.None]: 'SvgoBan',
};

const colorPickerVisible = ref(false);

const isHatchure = computed(
  () => kind.value !== ShapeFillKind.None && kind.value !== ShapeFillKind.Solid,
);

onUnmounted(() => {
  emit('blur');
});
</script>
