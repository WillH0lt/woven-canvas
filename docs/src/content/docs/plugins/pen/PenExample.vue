<script setup lang="ts">
import { WovenCanvas, PenTool, SelectTool, Toolbar, ColorButton } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
</script>

<template>
  <WovenCanvas>
    <Toolbar>
      <SelectTool />
      <PenTool />
      <ColorButton />
    </Toolbar>
  </WovenCanvas>
</template>
