<template>
  <div>
    <img
      class="aspect-square w-full translate-y-2 cursor-pointer rounded-lg"
      :style="{
        'pointer-events': giphyVisible ? 'none' : 'auto',
      }"
      :src="`/img/squiggle.${hovered ? 'webp' : 'png'}`"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      @click="giphyVisible = true"
    />

    <Teleport to="body" v-if="giphyVisible">
      <StudioOverlay>
        <div
          class="absolute bottom-24 left-1/2 -translate-x-1/2 w-96 bg-gray-300 border border-black rounded-t-lg overflow-x-hidden z-50"
          v-on-click-outside="() => (giphyVisible = false)"
          @click.stop
          @wheel.stop
        >
          <div class="w-full h-16 flex">
            <input
              class="flex-1 h-full px-4 py-2 text-xl bg-white text-black border-0 focus:ring-0"
              type="text"
              v-model="text"
              placeholder="Search GIPHY"
              @keydown.enter="search"
            />
            <div
              class="flex items-center justify-center aspect-square flex-shrink-0 h-full bg-white hover:bg-[#f0f0f0] transition-colors cursor-pointer"
              @click="search"
            >
              <svgoSearch class="w-10" />
            </div>
          </div>
          <GiphyGrid
            class="w-full h-96"
            :search="searchText"
            default-search="squiggle"
            :search-mode="searchMode"
            @select="select"
          />
          <div class="flex justify-center items-center p-2">
            <div
              class="bg-darken first:rounded-l last:rounded-r text-black w-32 text-center py-1 transition-colors cursor-pointer"
              :class="{
                'bg-primary text-white': s === searchMode,
              }"
              @click="searchMode = s"
              v-for="s in [GiphySearchMode.Sticker, GiphySearchMode.Gif]"
            >
              {{ s }}
            </div>
          </div>
          <img class="w-32 mx-auto my-2" src="/img/giphyBadge.png" alt="Powered by Giphy" />
        </div>
      </StudioOverlay>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { PartTag } from '@prisma/client';
import type { Part } from '@prisma/client';
import { vOnClickOutside } from '@vueuse/components';
import type { IGif } from '@giphy/js-types';

import { GiphySearchMode } from '~/types';

const emit = defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();

const giphyVisible = ref(false);
const hovered = ref(false);
const searchMode = ref<GiphySearchMode>(GiphySearchMode.Sticker);

function select(gif: IGif) {
  giphyVisible.value = false;
  const size = 200;
  let { width, height } = gif.images.downsized_large;

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
    src: gif.images.downsized_large.url,
    srcWidth: gif.images.downsized_large.width,
    srcHeight: gif.images.downsized_large.height,
  });
}

const text = ref('');
const searchText = ref('');
async function search() {
  searchText.value = text.value;
  text.value = '';
}
</script>
<style scoped>
input:focus {
  outline: none;
}
</style>
