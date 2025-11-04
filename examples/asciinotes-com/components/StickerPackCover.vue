<template>
  <div
    class="grid grid-cols-3 gap-2 p-2 aspect-[2/1] bg-gray-100 rounded cursor-pointer hover:drop-shadow-lg hover:bg-white transition-[box-shadow,background-color]"
  >
    <img
      class="aspect-square object-contain"
      v-for="i in 6"
      :key="i"
      :src="`https://storage.googleapis.com/scrolly-page-stickers/${stickerPack.directory}/${thumbnail(stickerPack.stickers[i])}`"
    />
  </div>
</template>

<script setup lang="ts">
import type { StickerPack } from '~/types';

defineProps<{
  stickerPack: StickerPack;
}>();

function thumbnail(sticker: string) {
  if (sticker.endsWith('.png')) {
    return `thumb_${sticker}`;
  }

  return sticker;
}
</script>
