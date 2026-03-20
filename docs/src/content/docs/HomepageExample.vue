<script setup lang="ts">
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import initialState from './initialState.json'
</script>

<template>
  <WovenCanvas
    :background="{ kind: 'dots' }"
    :store="{
      persistence: {
        documentId: 'homepage'
      }
    }"
    :initialState="initialState"
  >
  </WovenCanvas>
</template>
