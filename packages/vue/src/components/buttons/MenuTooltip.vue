<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFloating, offset, flip, shift } from '@floating-ui/vue'
import { mountedTooltipInstances, useTooltipSingleton } from '../../composables/useTooltipSingleton'

const { activeTooltip, isVisible } = useTooltipSingleton()

const tooltipRef = ref<HTMLElement | null>(null)
const anchorRef = computed(() => activeTooltip.value?.anchor ?? null)
// Per-tooltip placement (defaults to 'top'); flip() falls back to the opposite
// side if there isn't room.
const placement = computed(() => activeTooltip.value?.placement ?? 'top')

const { floatingStyles } = useFloating(anchorRef, tooltipRef, {
  placement,
  middleware: [offset(8), flip(), shift({ padding: 8 })],
})

// Only the first-mounted MenuTooltip renders. Pages with multiple WovenCanvas
// instances would otherwise produce duplicate tooltip DOM nodes.
const instanceId = Symbol('menu-tooltip')
const isPrimary = computed(() => mountedTooltipInstances.value[0] === instanceId)

onMounted(() => {
  mountedTooltipInstances.value.push(instanceId)
})

onUnmounted(() => {
  mountedTooltipInstances.value = mountedTooltipInstances.value.filter((id) => id !== instanceId)
})

const shouldShow = computed(() => isPrimary.value && isVisible.value && activeTooltip.value?.text)
</script>

<template>
  <Teleport to="body">
    <Transition name="wov-tooltip-fade">
      <div
        v-if="shouldShow"
        ref="tooltipRef"
        class="wov-menu-tooltip"
        :style="floatingStyles"
      >
        {{ activeTooltip?.text }}
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* Fallbacks are required because the tooltip is teleported to <body>, which
   sits outside `.wov-root` where the theme vars are defined. */
.wov-menu-tooltip {
  position: absolute;
  z-index: var(--wov-z-tooltip, 1002);
  width: max-content;
  background: var(--wov-gray-700, #060607);
  color: var(--wov-gray-100, #f8f9f9);
  font-family: var(--wov-font-family, "Figtree", sans-serif);
  font-weight: bold;
  padding: 5px 10px;
  border-radius: var(--wov-menu-tooltip-border-radius, 6px);
  font-size: 12px;
  pointer-events: none;
}

.wov-tooltip-fade-enter-active {
  transition: opacity 0.15s ease-out;
}

.wov-tooltip-fade-leave-active {
  transition: opacity 0.1s ease-out;
}

.wov-tooltip-fade-enter-from,
.wov-tooltip-fade-leave-to {
  opacity: 0;
}
</style>
