<script setup lang="ts">
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
</script>

<template>
  <WovenCanvas :store="{
    persistence: {
      documentId: 'homepage'
    }
  }">
  </WovenCanvas>
</template>
