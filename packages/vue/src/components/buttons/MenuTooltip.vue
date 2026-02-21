<script setup lang="ts">
import { ref, computed, watch, inject, type Ref } from "vue";
import { useFloating, offset, flip, shift } from "@floating-ui/vue";
import { useTooltipSingleton } from "../../composables/useTooltipSingleton";

const { activeTooltip, isVisible } = useTooltipSingleton();

// Get container ref from WovenCanvas for teleport
const containerRef = inject<Ref<HTMLElement | null>>("containerRef");

// Tooltip element ref
const tooltipRef = ref<HTMLElement | null>(null);

// Virtual reference element that tracks the anchor
const anchorRef = computed(() => activeTooltip.value?.anchor ?? null);

// Use floating-ui for positioning
const { floatingStyles } = useFloating(anchorRef, tooltipRef, {
  placement: "top",
  middleware: [
    offset(8),
    flip({ fallbackPlacements: ["bottom"] }),
    shift({ padding: 8 }),
  ],
});

// Track if tooltip should be displayed (combines visibility state with having content)
const shouldShow = computed(() => isVisible.value && activeTooltip.value?.text);
</script>

<template>
  <Teleport v-if="containerRef" :to="containerRef">
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
.wov-menu-tooltip {
  position: absolute;
  z-index: var(--wov-z-tooltip);
  width: max-content;
  background: var(--wov-gray-700);
  color: var(--wov-gray-100);
  font-weight: bold;
  padding: 5px 10px;
  border-radius: var(--wov-menu-tooltip-border-radius);
  font-size: 70%;
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
