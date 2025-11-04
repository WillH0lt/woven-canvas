<template>
  <div class="flex flex-col w-full max-w-lg h-[100dvh] overflow-hidden pointer-events-none">
    <div
      class="absolute w-full h-20 bottom-0 rounded-t-2xl bg-gray-300 pointer-events-auto"
      v-if="studioStore.submenu !== SubmenuKind.None"
    >
      <ToolbarSubmenu
        v-if="studioStore.submenu === SubmenuKind.Crayon"
        :brushKind="BrushKinds.Crayon"
      />
      <ToolbarSubmenu
        v-if="studioStore.submenu === SubmenuKind.Marker"
        :brushKind="BrushKinds.Marker"
      />
    </div>
    <div
      class="h-20 mt-auto flex items-center justify-center drop-shadow-2xl rounded-t-2xl cursor-default bg-gray-300 pointer-events-auto transition-transform"
      :class="{ 'translate-y-28': studioStore.submenu !== SubmenuKind.None }"
    >
      <StudioToolbarCursor class="w-14" />
      <div class="flex-1 overflow-hidden pointer-events-non h-full">
        <div
          ref="toolbarItemsRef"
          class="flex items-center gap-6 px-4 w-full h-full [&>*]:flex-shrink-0 [&>*]:pointer-events-auto [&>*]:select-none"
          :style="{
            transform: `translateX(-${scrollX}px)`,
            transition: 'transform 0.2s',
          }"
        >
          <div class="w-12 h-full flex items-center justify-center" data-tooltip="Text">
            <StudioToolbarText @select="(part: Partial<Part>) => emit('select-part', part)" />
          </div>
          <div class="w-16 h-full flex items-center justify-center" data-tooltip="Upload Photo">
            <StudioToolbarImage @select="(part: Partial<Part>) => emit('select-part', part)" />
          </div>
          <div class="w-24 h-full flex items-center justify-center" data-tooltip="Gifs">
            <StudioToolbarGiphy @select="(part: Partial<Part>) => emit('select-part', part)" />
          </div>
          <!-- <div class="w-24 h-full flex items-center justify-center" data-tooltip="3D Models">
            <StudioToolbarMeshes @select="(part: Partial<Part>) => emit('select-part', part)" />
          </div> -->
          <div class="w-14 h-full flex items-center justify-center" data-tooltip="Crayon">
            <StudioToolbarCrayon @click="studioStore.submenu = SubmenuKind.Crayon" />
          </div>
          <div class="w-[72px] h-full flex items-center justify-center" data-tooltip="Marker">
            <StudioToolbarMarker @click="studioStore.submenu = SubmenuKind.Marker" />
          </div>
          <div class="h-full flex items-center justify-center -mr-6" data-tooltip="Buttons">
            <StudioToolbarButton @select="(part: Partial<Part>) => emit('select-part', part)" />
          </div>
          <div class="h-full flex items-center justify-center -mr-6" data-tooltip="Shapes">
            <StudioToolbarShape @select="(part: Partial<Part>) => emit('select-part', part)" />
          </div>
          <div class="h-full flex items-center justify-center" data-tooltip="Stickers">
            <StudioToolbarStickers @select="(part: Partial<Part>) => emit('select-part', part)" />
          </div>
          <div class="h-full flex items-center justify-center" data-tooltip="Tape">
            <StudioToolbarTape @select="(part: Partial<Part>) => emit('select-part', part)" />
          </div>

          <div class="w-20 h-full" data-tooltip="Sticky Note">
            <StudioToolbarStickyNotes
              @select="(part: Partial<Part>) => emit('select-part', part)"
            />
          </div>
          <!-- <div class="w-20 h-full" data-tooltip="Sticky Note">
            <StudioToolbarStickyNotes
              @select="
                (part: Partial<Part>) =>
                  emit('select-part', {
                    ...part,
                    tag: PartTag.Button,
                    width: 200,
                    height: 60,
                  })
              "
            />
          </div> -->

          <!-- <StudioToolbarVideo
            class="w-16 h-full flex items-center justify-center"
            @select="(part: Partial<Part>) => emit('select-part', part)"
            data-tooltip="Upload Video"
          /> -->
        </div>
      </div>
      <div
        ref="arrowsRef"
        class="w-14 h-full flex flex-col rounded-tr-2xl border-l border-l-gray-500 bg-gray-300"
      >
        <div
          class="h-1/2 flex items-center justify-center border-b border-b-gray-500 rounded-tr-2xl cursor-pointer transition-colors"
          :class="{ 'text-gray-500': rightDisabled, 'hover:bg-darken': !rightDisabled }"
          @click="shiftRight"
          data-tooltip="Shift Right"
        >
          <SvgoArrowRight class="w-4" />
        </div>
        <div
          class="h-1/2 flex items-center justify-center cursor-pointer transition-colors"
          :class="{ 'text-gray-500': leftDisabled, 'hover:bg-darken': !leftDisabled }"
          @click="shiftLeft"
          data-tooltip="Shift Left"
        >
          <SvgoArrowLeft class="w-4" />
        </div>
      </div>
    </div>

    <!--
    <svg
      ref="svgRef"
      class="absolute w-full h-full overflow-visible pointer-events-none -z-10"
    ></svg> -->
  </div>
</template>

<script setup lang="ts">
import { BrushKinds } from '@scrolly-page/brushes';
import type { Part } from '@prisma/client';
import { PartTag } from '@prisma/client';
import StudioToolbarGiphy from './StudioToolbarGiphy.vue';
import { SubmenuKind } from '../types/index.js';

const emit = defineEmits<{
  (e: 'select-part', part: Partial<Part>): void;
}>();

const studioStore = useStudioStore();

const toolbarItemsRef = ref<HTMLElement | null>(null);
const scrollX = ref(0);
const SHIFT = 200;
const leftDisabled = computed(() => scrollX.value === 0);
const rightDisabled = computed(() => {
  if (!toolbarItemsRef.value) return true;
  const { scrollWidth, clientWidth } = toolbarItemsRef.value;
  return scrollX.value >= scrollWidth - clientWidth;
});

useTooltips(toolbarItemsRef, 'top');

const arrowsRef = ref<HTMLElement | null>(null);
useTooltips(arrowsRef, 'right');

function shiftLeft() {
  scrollX.value = Math.max(0, scrollX.value - SHIFT);
}

function shiftRight() {
  if (!toolbarItemsRef.value) return;
  const { scrollWidth, clientWidth } = toolbarItemsRef.value;
  scrollX.value = Math.min(scrollWidth - clientWidth + 10, scrollX.value + SHIFT);
}

// function handleWheel(e: WheelEvent) {
//   e.preventDefault();
//   if (e.deltaY < 0) shiftLeft();
//   else shiftRight();
// }
</script>
