<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTooltipSingleton } from '../../composables/useTooltipSingleton'

const props = defineProps<{
  title?: string
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonRef = ref<HTMLButtonElement | null>(null)
const isHovered = ref(false)
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton()

function handleClick(event: MouseEvent) {
  emit('click', event)
}

function handleMouseEnter() {
  isHovered.value = true
  if (props.title && buttonRef.value) {
    showTooltip(props.title, buttonRef.value)
  }
}

function handleMouseLeave() {
  isHovered.value = false
  hideTooltip()
}

// The tooltip captures its text on mouseenter, so a button that relabels itself
// under the cursor — a toggle whose title flips when clicked — would keep
// showing the old text until the pointer leaves and comes back.
watch(
  () => props.title,
  (title) => {
    if (!isHovered.value || !title || !buttonRef.value) return
    showTooltip(title, buttonRef.value)
  },
)
</script>

<template>
  <button
    ref="buttonRef"
    class="wov-menu-button"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </button>
</template>

<style>
.wov-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--wov-gray-100);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.wov-menu-button.wov-active {
  background-color: var(--wov-primary);
}

.wov-menu-button svg {
  width: 22px;
  height: 18px;
  flex-shrink: 0;
}
</style>
