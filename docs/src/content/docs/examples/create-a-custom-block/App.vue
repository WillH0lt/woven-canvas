<script setup lang="ts">
import { WovenCanvas, SelectTool, HandTool, FloatingMenuBar, Toolbar } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { Sticker } from './Sticker'
import StickerBlock from './StickerBlock.vue'
import StickerTool from './StickerTool.vue'
import StickerMenuButton from './StickerMenuButton.vue'

const blockDefs = [
  {
    tag: 'sticker',
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
