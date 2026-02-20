<script setup lang="ts">
import { computed } from 'vue'
import { useComponent } from '@woven-canvas/vue'
import { Block } from '@woven-canvas/core'
import { Tnt } from './TntPlugin'

const props = defineProps<{
  entityId: number
  selected: boolean
}>()

const block = useComponent(props.entityId, Block)
const tnt = useComponent(props.entityId, Tnt)

// Calculate blast radius circle dimensions
const blastRadiusStyle = computed(() => {
  if (!block.value || !tnt.value) return {}

  const [width, height] = block.value.size
  const radius = tnt.value.blastRadius
  const diameter = radius * 2

  // Center the circle on the block
  const offsetX = (diameter - width) / 2
  const offsetY = (diameter - height) / 2

  return {
    width: `${diameter}px`,
    height: `${diameter}px`,
    left: `-${offsetX}px`,
    top: `-${offsetY}px`,
  }
})

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  containerType: 'size' as const,
  filter: props.selected ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.7))' : 'none',
  transition: 'filter 0.15s ease',
}))
</script>

<template>
  <div :style="containerStyle">
    <div class="blast-radius" :style="blastRadiusStyle" />
    <span class="emoji">🧨</span>
  </div>
</template>

<style scoped>
.emoji {
  font-size: 90cqmin;
  line-height: 1;
  user-select: none;
}

.blast-radius {
  position: absolute;
  border: 2px dashed rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.05);
  pointer-events: none;
}
</style>
