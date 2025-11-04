<template>
  <div class="h-full flex gap-4 justify-center items-center px-4 border-l border-x-gray-400">
    <img
      v-for="(stickerUrl, idx) in toolbarStickerUrls"
      :key="stickerUrl"
      class="w-8 cursor-pointer transition-transform scale-150 hover:scale-[2] object-contain hover:z-10"
      :src="stickerUrl"
      :class="{
        '-translate-y-2': idx % 2 === 0,
        'translate-y-2': idx % 2 === 1,
      }"
      @click="() => select(stickerUrl)"
    />

    <div
      class="flex items-center justify-center border-2 rounded h-8 w-8 border-black cursor-pointer hover:bg-gray-200 transition-colors"
      @click="stickersVisible = true"
    >
      <svgoPlus class="w-4 h-4" />
    </div>
  </div>
  <Teleport to="body" v-if="stickersVisible">
    <StudioOverlay>
      <div
        class="absolute bottom-24 left-1/2 -translate-x-1/2 w-[500px] max-w-full bg-gray-300 border border-black rounded-t-lg overflow-x-hidden z-50"
        v-on-click-outside="() => handleClickOutside()"
        @click.stop
        @wheel.stop
      >
        <div class="p-4 overflow-y-scroll h-96">
          <div class="w-full h-full" v-if="selectedStickerPack !== null">
            <div class="flex items-center mb-4 border-b border-b-gray-400 pb-2">
              <div
                class="rounded-lg hover:bg-gray-200 p-2 transition-colors cursor-pointer"
                @click="selectedStickerPack = null"
              >
                <LazySvgoChevronLeft class="h-5" />
              </div>
              <div class="ml-4">
                {{ selectedStickerPack.title }} By {{ selectedStickerPack.author }}
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div v-for="sticker in selectedStickerPack.stickers" :key="sticker">
                <img
                  class="rounded-sm object-contain w-full aspect-square cursor-pointer"
                  :src="thumbnailUrl(selectedStickerPack.directory, sticker)"
                  @click="select(stickerUrl(selectedStickerPack.directory, sticker))"
                />
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 w-full h-full" v-else>
            <div v-for="stickerPack in stickerPacks" @click="selectedStickerPack = stickerPack">
              <StickerPackCover :stickerPack="stickerPack" />
              <div class="flex flex-col items-center justify-center text-center">
                <div class="text-gray-700 text-sm font-semibold">
                  {{ stickerPack.title }} by {{ stickerPack.author }}
                </div>
              </div>
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
import type { StickerPack } from '~/types';

import stickerPacksData from '~/stickers.json';

const stickerPacks: StickerPack[] = stickerPacksData;

const emit = defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();

const toolbarStickerUrls = ref<string[]>([]);

onMounted(() => {
  while (toolbarStickerUrls.value.length < 3) {
    const stickerUrl = randomSticker();
    if (!toolbarStickerUrls.value.includes(stickerUrl)) {
      toolbarStickerUrls.value.push(stickerUrl);
    }
  }
});

function randomSticker(): string {
  const randomStickerPack = stickerPacks[Math.floor(Math.random() * stickerPacks.length)];
  const randomSticker =
    randomStickerPack.stickers[Math.floor(Math.random() * randomStickerPack.stickers.length)];

  return thumbnailUrl(randomStickerPack.directory, randomSticker);
}

const stickersVisible = ref(false);
const selectedStickerPack = ref<StickerPack | null>(null);

function thumbnailUrl(directory: string, sticker: string): string {
  if (sticker.endsWith('.png')) {
    return `https://storage.googleapis.com/scrolly-page-stickers/${directory}/thumb_${sticker}`;
  }

  return `https://storage.googleapis.com/scrolly-page-stickers/${directory}/${sticker}`;
}

function stickerUrl(directory: string, sticker: string): string {
  return `https://storage.googleapis.com/scrolly-page-stickers/${directory}/${sticker}`;
}

async function select(stickerUrl: string) {
  if (!toolbarStickerUrls.value.includes(stickerUrl)) {
    toolbarStickerUrls.value = toolbarStickerUrls.value.slice(1).concat(stickerUrl);
  }

  stickersVisible.value = false;
  const size = 200;

  let { width: srcWidth, height: srcHeight } = await getImageDimensions(stickerUrl);
  let width = srcWidth;
  let height = srcHeight;

  if (width > height) {
    height = (height / width) * size;
    width = size;
  } else {
    width = (width / height) * size;
    height = size;
  }

  emit('select', {
    tag: PartTag.Image,
    width,
    height,
    src: stickerUrl,
    srcWidth,
    srcHeight,
  });

  selectedStickerPack.value = null;
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
  stickersVisible.value = false;
  selectedStickerPack.value = null;
}
</script>
