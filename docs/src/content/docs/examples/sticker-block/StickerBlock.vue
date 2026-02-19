<script setup lang="ts">
import { computed } from 'vue'
import { useComponent } from '@woven-canvas/vue'
import { StickerData } from './StickerData'

const props = defineProps<{
  entityId: number
  selected: boolean
}>()

// Subscribe to sticker data reactively
const sticker = useComponent(() => props.entityId, StickerData)

const style = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'min(80%, 80cqmin)', // Scale with container
  lineHeight: 1,
  userSelect: 'none' as const,
  containerType: 'size' as const,
  // Subtle shadow when selected
  filter: props.selected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none',
  transition: 'filter 0.15s ease',
}))
</script>

<template>
  <div :style="style">
    {{ sticker?.emoji }}
  </div>
</template>
