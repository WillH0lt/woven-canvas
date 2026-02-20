<script setup lang="ts">
import { computed } from 'vue'
import { useComponent } from '@woven-canvas/vue'
import { Sticker } from './Sticker'

const props = defineProps<{
  entityId: number
  selected: boolean
}>()

// Subscribe to sticker data reactively
const sticker = useComponent(props.entityId, Sticker)

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  containerType: 'size' as const,
  // Subtle shadow when selected
  filter: props.selected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none',
  transition: 'filter 0.15s ease',
}))
</script>

<template>
  <div :style="containerStyle">
    <span class="emoji">{{ sticker?.emoji }}</span>
  </div>
</template>

<style scoped>
.emoji {
  font-size: 90cqmin;
  line-height: 1;
  user-select: none;
}
</style>
