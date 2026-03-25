<script setup lang="ts">
import { inject, type Ref, ref } from 'vue'
import type { CopyPasteOptions } from './WovenCanvasCore.vue'
import { useClipboard } from '../composables/useClipboard'

const props = defineProps<{
  options?: CopyPasteOptions
}>()

const containerRef = inject<Ref<HTMLElement | null>>('containerRef', ref(null))

useClipboard(containerRef, props.options)
</script>

<template>
  <slot />
</template>
