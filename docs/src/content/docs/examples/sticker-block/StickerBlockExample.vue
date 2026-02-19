<script setup lang="ts">
import { WovenCanvas, SelectTool, HandTool, FloatingMenuBar } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { StickerData } from './StickerData'
import StickerBlock from './StickerBlock.vue'
import StickerTool from './StickerTool.vue'
import StickerEmojiButton from './StickerEmojiButton.vue'

// Block definition for stickers
const blockDefs = [
  {
    tag: 'sticker',
    resizeMode: 'scale' as const,
    canRotate: true,
    components: [StickerData],
  },
]
</script>

<template>
  <WovenCanvas :editor="{ components: [StickerData], blockDefs }" style="width: 100%; height: 100%">
    <!-- Toolbar -->
    <template #toolbar>
      <div style="display: flex; gap: 4px; padding: 8px; background: #374151; border-radius: 8px">
        <SelectTool />
        <HandTool />
        <StickerTool />
      </div>
    </template>

    <!-- Floating menu with emoji picker -->
    <template #floating-menu>
      <FloatingMenuBar>
        <template #button:sticker-data="{ entityIds }">
          <StickerEmojiButton :entity-ids="entityIds" />
        </template>
      </FloatingMenuBar>
    </template>

    <!-- Block renderer -->
    <template #block:sticker="props">
      <StickerBlock v-bind="props" />
    </template>
  </WovenCanvas>
</template>
