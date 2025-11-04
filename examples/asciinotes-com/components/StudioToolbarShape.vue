<template>
  <div class="h-full flex gap-4 justify-center items-center px-4 border-l border-x-gray-400">
    <component
      v-for="(shape, idx) of toolbarShapes"
      :key="shape"
      :is="`SvgoShape${shape}`"
      class="w-6 h-6 overflow-visible cursor-pointer transition-transform hover:scale-150 hover:z-10"
      :class="{
        '-translate-y-2': idx % 2 === 0,
        'translate-y-2': idx % 2 === 1,
      }"
      :style="{
        fill: backgroundColor,
      }"
      @click="select(shape)"
    />
    <div
      class="flex items-center justify-center border-2 rounded h-8 w-8 border-black cursor-pointer hover:bg-gray-200 transition-colors"
      @click="shapesVisible = true"
    >
      <svgoPlus class="w-4 h-4" />
    </div>
  </div>

  <Teleport to="body" v-if="shapesVisible">
    <StudioOverlay>
      <div
        class="absolute bottom-24 left-1/2 -translate-x-1/2 w-96 bg-gray-300 border border-black rounded-t-lg overflow-x-hidden z-50"
        v-on-click-outside="() => (shapesVisible = false)"
        @click.stop
        @wheel.stop
      >
        <div class="p-4 overflow-y-scroll h-96">
          <div class="grid grid-cols-4 gap-8 w-full h-full">
            <component
              class="overflow-visible cursor-pointer transition-transform hover:scale-110 hover:z-10"
              :is="`SvgoShape${shape}`"
              v-for="shape in shapes"
              :key="shape"
              :style="{
                fill: backgroundColor,
              }"
              @click="select(shape)"
            >
            </component>
          </div>
        </div>
      </div>
    </StudioOverlay>
  </Teleport>
</template>

<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';
import { PartTag, ShapeKind, ShapeFillKind, ShapeStrokeKind } from '@prisma/client';
import type { Part } from '@prisma/client';

const emit = defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();

const backgroundColor = ref('#ffeb7f');

const shapesVisible = ref(false);

const DEFAULTS: Partial<Part> = {
  tag: PartTag.Shape,
  width: 100,
  height: 100,
  aspectLocked: false,
  shapeStrokeColor: '#000000',
  shapeStrokeWidth: 2,
  shapeStrokeKind: ShapeStrokeKind.Solid,
  shapeFillKind: ShapeFillKind.Solid,
  shapeRoughness: 1.5,
};

const toolbarShapes = ref<ShapeKind[]>([ShapeKind.Rectangle, ShapeKind.Ellipse, ShapeKind.Star]);

const shapes = [
  ShapeKind.Rectangle,
  ShapeKind.Ellipse,
  ShapeKind.Triangle,
  ShapeKind.Pentagon,
  ShapeKind.Hexagon,
  ShapeKind.Star,
  ShapeKind.Heart,
  ShapeKind.Diamond,
  ShapeKind.Explosion,
  ShapeKind.Crescent,
  ShapeKind.Speech,
  ShapeKind.Cloud,
  ShapeKind.Rainbow,
  ShapeKind.Kapow,
  ShapeKind.Flower,
  ShapeKind.Sticker,
  ShapeKind.Flare,
];

function select(shapeKind: ShapeKind) {
  if (!toolbarShapes.value.includes(shapeKind)) {
    toolbarShapes.value = toolbarShapes.value.slice(1).concat(shapeKind);
  }

  shapesVisible.value = false;

  emit('select', {
    ...DEFAULTS,
    shapeKind,
    shapeFillColor: backgroundColor.value,
  });
}
</script>
