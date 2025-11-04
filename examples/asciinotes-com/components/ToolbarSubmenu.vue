<template>
  <div class="w-full h-full flex items-center gap-4 pr-4">
    <div
      ref="componentRef"
      class="w-14 h-full flex flex-col rounded-tl-2xl border-r border-r-gray-500"
    >
      <div
        class="h-1/2 flex items-center justify-center bg-gray-300 border-b border-b-gray-500 rounded-tl-2xl cursor-pointer transition-colors hover:bg-darken"
        @click="keep"
        data-tooltip="Keep"
      >
        <SvgoCheck class="w-6 h-6" />
      </div>
      <div
        class="h-1/2 flex items-center justify-center bg-gray-300 cursor-pointer transition-colors hover:bg-darken"
        @click="cancel"
        data-tooltip="Cancel"
      >
        <SvgoX class="w-6 h-6" />
      </div>
    </div>
    <div class="flex-1 flex justify-between px-2" v-if="brushKind === BrushKinds.Crayon">
      <SvgoCrayon
        v-for="(color, index) in colors"
        class="w-6 hover:translate-y-10 transition-transform cursor-pointer"
        :class="{
          'translate-y-16': selectedIndex !== index,
          'translate-y-10': selectedIndex === index,
          'dark-wax': luminance(color) < 50,
          'bright-wax': luminance(color) > 175,
        }"
        :style="{
          fill: color,
        }"
        @click="handleColorClick(index)"
      />
    </div>
    <div class="flex-1 flex justify-between px-2" v-if="brushKind === BrushKinds.Marker">
      <SvgoMarker
        v-for="(color, index) in colors"
        class="w-12 hover:translate-y-6 transition-transform cursor-pointer"
        :class="{
          'translate-y-16': selectedIndex !== index,
          'translate-y-6': selectedIndex === index,
        }"
        :style="{
          color,
        }"
        @click="handleColorClick(index)"
      />
    </div>

    <img
      class="w-14 hover:translate-y-2 transition-transform cursor-pointer"
      src="/img/eraser.png"
      :class="{
        'translate-y-2': selected === Selection.Eraser,
        'translate-y-8': selected !== Selection.Eraser,
      }"
      @click="handleEraserClick"
    />

    <div
      class="flex justify-center items-center w-10 h-10 rounded-xl cursor-pointer hover:bg-darken transition-colors"
      @click="handleHandClick"
    >
      <div
        class="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-colors"
        :class="{
          'bg-primary': selected === Selection.Hand,
          'hover:bg-gray': selected !== Selection.Hand,
        }"
      >
        <SvgoHand
          class="w-full h-full px-2 m-auto transition-colors"
          :class="{
            'text-white': selected === Selection.Hand,
          }"
        />
      </div>
    </div>

    <ElementColorPicker
      v-model="selectedColor"
      @show="handleColorPickerClick"
      @blur="updateBrush"
      placement="top"
      :offset="25"
      :shift="-85"
    />
  </div>
</template>

<script setup lang="ts">
import { BrushKinds } from '@scrolly-page/brushes';
import { SubmenuKind } from '~/types';
import { PointerAction } from '~/packages/studio/src/types.js';

import { luminance } from '~/utils.js';

enum Selection {
  One,
  Two,
  Three,
  Four,
  Eraser,
  Hand,
}

const props = defineProps<{
  brushKind: BrushKinds;
}>();

const componentRef = ref<HTMLElement | null>(null);
useTooltips(componentRef, 'left');

const studioStore = useStudioStore();

const colors = ref<[string, string, string, string]>(['#eb4034', '#f4a623', '#f8e71c', '#7ed321']);
// const selectedColor = ref(colors.value[0]);

const selected = ref(Selection.One);
const selectedIndex = computed({
  get: () => {
    switch (selected.value) {
      case Selection.One:
        return 0;
      case Selection.Two:
        return 1;
      case Selection.Three:
        return 2;
      case Selection.Four:
        return 3;
      case Selection.Eraser:
        return -1;
      case Selection.Hand:
        return -1;
    }
  },
  set: (value: number) => {
    switch (value) {
      case 0:
        selected.value = Selection.One;
        break;
      case 1:
        selected.value = Selection.Two;
        break;
      case 2:
        selected.value = Selection.Three;
        break;
      case 3:
        selected.value = Selection.Four;
        break;
      case -1:
        selected.value = Selection.Eraser;
        break;
    }
  },
});
const selectedColor = computed({
  get: () => {
    if (selectedIndex.value === -1) {
      return '#00000000';
    }

    return colors.value[selectedIndex.value];
  },
  set: (value: string) => {
    if (selectedIndex.value === -1) {
      return;
    }

    colors.value[selectedIndex.value] = value;
  },
});

const _cursor = ref(PointerAction.Draw);

const cursor = computed({
  get: () => _cursor.value,
  set: (value: PointerAction) => {
    _cursor.value = value;
    if (value === PointerAction.Draw) {
      studioStore.inputSettings.actionLeftMouse = PointerAction.Draw;
    } else {
      studioStore.inputSettings.actionLeftMouse = PointerAction.Pan;
    }
  },
});

function handleColorClick(index: number) {
  selectedIndex.value = index;
  // picker?.color.set(colors.value[index]);
  cursor.value = PointerAction.Draw;
  updateBrush();
}

function handleEraserClick() {
  selected.value = Selection.Eraser;
  cursor.value = PointerAction.Draw;
  updateBrush();
}

function handleHandClick() {
  cursor.value = PointerAction.Pan;
  // selectedIndex.value = -1;
  selected.value = Selection.Hand;
}

function handleColorPickerClick() {
  cursor.value = PointerAction.Draw;
  selectedIndex.value = selectedIndex.value === -1 ? 0 : selectedIndex.value;
}

watch(
  colors,
  (colors) => {
    localStorage.setItem('crayon-colors', JSON.stringify(colors));
  },
  { deep: true },
);

onMounted(() => {
  if (!import.meta.client) return;

  const savedColors = JSON.parse(localStorage.getItem('crayon-colors') || '[]');
  if (Array.isArray(savedColors) && savedColors.length >= 4) {
    colors.value = savedColors.slice(0, 4) as [string, string, string, string];
  }

  const color = colors.value[0];

  updateBrush();
  cursor.value = PointerAction.Draw;
  studioStore.startInnerEdit();
});

function updateBrush() {
  const index = selectedIndex.value === -1 ? 0 : selectedIndex.value;
  const color = colors.value[index];

  const brushKind = selected.value === Selection.Eraser ? BrushKinds.Eraser : props.brushKind;

  studioStore.updateBrushColor(color, brushKind);
}

function cancel() {
  studioStore.submenu = SubmenuKind.None;
  studioStore.inputSettings.actionLeftMouse = PointerAction.Interact;
  studioStore.cancelInnerEdit();
}

function keep() {
  studioStore.submenu = SubmenuKind.None;
  studioStore.inputSettings.actionLeftMouse = PointerAction.Interact;
  studioStore.finishInnerEdit();
}
</script>
