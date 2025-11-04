<template>
  <div class="h-full flex gap-4 justify-center items-center px-4 border-x border-x-gray-400">
    <div class="relative w-14">
      <div
        class="absolute w-12 h-96 cursor-pointer transition-transform -translate-y-4 hover:-translate-y-8"
        @click="() => select(toolbarTape)"
        :style="{
          'background-image': `url(${tapeUrl(toolbarTape.image)})`,
          'background-size':
            48 / (toolbarTape.width / toolbarTape.height) > 384 ? 'cover' : 'contain',
        }"
      ></div>
      <!-- <div
        class="absolute h-12 w-32 cursor-pointer transition-transform origin-left rotate-90 -translate-y-6 hover:-translate-y-2 bg-cover bg-primary bg-primary"
        @click="() => select(toolbarTape)"
      ></div> -->
      <!--  -->
    </div>

    <div
      class="flex items-center justify-center border-2 rounded h-8 w-8 border-black cursor-pointer hover:bg-gray-200 transition-colors"
      @click="tapesVisible = true"
    >
      <svgoPlus class="w-4 h-4" />
    </div>
  </div>
  <Teleport to="body" v-if="tapesVisible">
    <StudioOverlay>
      <div
        class="absolute bottom-20 left-1/2 -translate-x-1/2 w-[450px] max-w-full bg-gray-400 rounded-t-lg overflow-x-hidden z-50"
        v-on-click-outside="() => handleClickOutside()"
        @click.stop
        @wheel.stop
      >
        <div class="p-4">
          <div class="grid grid-cols-10 gap-4">
            <div v-for="tape in tapes" :key="tape.image">
              <img
                class="object-contain w-full aspect-square rounded-full cursor-pointer border-2 border-gray-500 hover:border-gray-700 transition-colors"
                :src="thumbnailUrl(tape.image)"
                @click="select(tape)"
              />
            </div>
          </div>
        </div>
      </div>
    </StudioOverlay>
  </Teleport>
</template>

<script setup lang="ts">
import { PartTag } from '@prisma/client';
import type { Part } from '@prisma/client';
import { vOnClickOutside } from '@vueuse/components';

import tapes from '~/tapes.json';

interface Tape {
  image: string;
  width: number;
  height: number;
}

const emit = defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();

const toolbarTape = ref<Tape>(tapes[0]);

const tapesVisible = ref(false);

function thumbnailUrl(tape: string): string {
  return `https://storage.googleapis.com/scrolly-page-tapes/thumb_${tape}`;
}

function tapeUrl(tape: string): string {
  return `https://storage.googleapis.com/scrolly-page-tapes/${tape}`;
}

async function select(tape: Tape) {
  toolbarTape.value = tape;

  tapesVisible.value = false;

  const url = tapeUrl(tape.image);
  const { width, height } = await getImageDimensions(url);

  emit('select', {
    tag: PartTag.Tape,
    width: 75,
    height: 250,
    src: url,
    srcWidth: width,
    srcHeight: height,
    rotateZ: -Math.PI / 2,
  });
}

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject; // Reject the promise if the image fails to load.
    img.src = url; // Set the source of the image.
  });
}

function handleClickOutside() {
  tapesVisible.value = false;
}
</script>
