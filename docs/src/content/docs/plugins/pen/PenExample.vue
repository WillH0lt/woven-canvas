<script setup lang="ts">
import { WovenCanvas, PenTool, SelectTool, Toolbar } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
</script>

<template>
  <WovenCanvas
    :plugin-options="{ controls: false, eraser: false, arrows: false }"
    :controls="{ leftMouseTool: 'pen' }"
  >
    <template #toolbar>
      <Toolbar>
        <SelectTool />
        <PenTool />
      </Toolbar>
    </template>
  </WovenCanvas>
</template>
