<template>
  <div ref="componentRef" class="h-full flex flex-col rounded-tl-2xl border-r border-r-gray-500">
    <div
      class="h-1/2 flex items-center justify-center bg-gray-300 border-b border-b-gray-500 rounded-tl-2xl cursor-pointer transition-colors"
      :class="{
        'bg-primary text-white': cursor === PointerAction.Interact,
        'hover:bg-darken': cursor !== PointerAction.Interact,
      }"
      @click="cursor = PointerAction.Interact"
      data-tooltip="Select Tool"
    >
      <SvgoPointer class="w-4" />
    </div>
    <div
      class="h-1/2 flex items-center justify-center bg-gray-300 cursor-pointer transition-colors"
      :class="{
        'bg-primary text-white': cursor === PointerAction.Pan,
        'hover:bg-darken': cursor !== PointerAction.Pan,
      }"
      @click="cursor = PointerAction.Pan"
      data-tooltip="Hand Tool"
    >
      <SvgoHand class="w-4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PointerAction, WheelAction } from '~/packages/studio/src/types.js';

const studioStore = useStudioStore();

const componentRef = ref<HTMLElement | null>(null);
useTooltips(componentRef, 'left');

const _cursor = ref(PointerAction.Interact);

const cursor = computed({
  get: () => _cursor.value,
  set: (value: PointerAction) => {
    _cursor.value = value;
    if (value === PointerAction.Interact) {
      studioStore.inputSettings.actionLeftMouse = PointerAction.Interact;
      studioStore.inputSettings.actionWheel = WheelAction.Scroll;
      studioStore.centerViewport();
    } else {
      studioStore.inputSettings.actionLeftMouse = PointerAction.Pan;
      studioStore.inputSettings.actionWheel = WheelAction.Zoom;
    }
  },
});

// const cursor = computed({
//   get: () => studioStore.inputSettings.actionLeftMouse,
//   set: (value: PointerAction) => {
//     studioStore.inputSettings.actionLeftMouse = value;
//   },
// });
</script>
