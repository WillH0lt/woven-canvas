<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  entityId: number
  selected: boolean
}>()

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  containerType: 'size' as const,
  filter: props.selected ? 'drop-shadow(0 0 8px rgba(107, 114, 128, 0.7))' : 'none',
  transition: 'filter 0.15s ease',
}))
</script>

<template>
  <div :style="containerStyle">
    <span class="emoji">🪨</span>
  </div>
</template>

<style scoped>
.emoji {
  font-size: 90cqmin;
  line-height: 1;
  user-select: none;
}
</style>
