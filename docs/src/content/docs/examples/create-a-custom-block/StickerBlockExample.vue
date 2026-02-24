<script setup lang="ts">
import '@woven-canvas/vue/style.css'
import { ResizeMode } from '@woven-canvas/core'
import { WovenCanvas, SelectTool, HandTool, FloatingMenuBar, Toolbar } from '@woven-canvas/vue'
import { Sticker } from './Sticker'
import StickerBlock from './StickerBlock.vue'
import StickerTool from './StickerTool.vue'
import StickerMenuButton from './StickerMenuButton.vue'

// Block definition for stickers
const blockDefs = [
  {
    tag: 'sticker',
    resizeMode: ResizeMode.Scale,
    canRotate: true,
    components: [Sticker],
  },
]
</script>

<template>
  <WovenCanvas :editor="{ components: [Sticker], blockDefs }">
    <!-- Toolbar -->
    <template #toolbar>
      <Toolbar>
        <SelectTool />
        <HandTool />
        <StickerTool />
      </Toolbar>
    </template>

    <!-- Floating menu with emoji picker -->
    <template #floating-menu>
      <FloatingMenuBar>
        <template #button:sticker="{ entityIds }">
          <StickerMenuButton :entity-ids="entityIds" />
        </template>
      </FloatingMenuBar>
    </template>

    <!-- Block renderer -->
    <template #block:sticker="props">
      <StickerBlock v-bind="props" />
    </template>
  </WovenCanvas>
</template>
