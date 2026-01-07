<script setup lang="ts">
import { ref, inject, watch, onUnmounted, type Ref } from "vue";
import { useFloating, offset, flip, shift } from "@floating-ui/vue";
import { useTooltipSingleton } from "../../composables/useTooltipSingleton";

const props = withDefaults(
  defineProps<{
    /** Tooltip text for the button */
    title?: string;
    /** Disable the button */
    disabled?: boolean;
    /** Placement of the dropdown relative to button */
    placement?: "top" | "bottom" | "left" | "right";
    /** Offset from the button in pixels */
    offsetPx?: number;
  }>(),
  {
    placement: "top",
    offsetPx: 8,
  }
);

const emit = defineEmits<{
  open: [];
  close: [];
}>();

// Get container ref from InfiniteCanvas for teleport
const containerRef = inject<Ref<HTMLElement | null>>("containerRef");

// Tooltip singleton
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton();

// Dropdown state
const isOpen = ref(false);
const buttonRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

// Use floating-ui for dropdown positioning
const { floatingStyles } = useFloating(buttonRef, dropdownRef, {
  placement: props.placement,
  middleware: [offset(props.offsetPx), flip(), shift({ padding: 8 })],
});

function toggle() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function open() {
  if (props.disabled) return;
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;

  if (
    buttonRef.value &&
    !buttonRef.value.contains(target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(target)
  ) {
    close();
  }
}

// Tooltip handlers
function handleMouseEnter() {
  if (props.title && buttonRef.value && !isOpen.value) {
    showTooltip(props.title, buttonRef.value);
  }
}

function handleMouseLeave() {
  hideTooltip();
}

// Watch open state to manage click outside listener, emit events, and hide tooltip
watch(isOpen, (open) => {
  if (open) {
    hideTooltip(); // Hide tooltip when dropdown opens
    document.addEventListener("click", handleClickOutside, true);
    emit("open");
  } else {
    document.removeEventListener("click", handleClickOutside, true);
    emit("close");
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside, true);
});

// Expose methods for programmatic control
defineExpose({ open, close, toggle, isOpen, buttonRef });
</script>

<template>
  <div
    ref="buttonRef"
    class="ic-menu-dropdown-trigger"
    :class="{ 'is-open': isOpen }"
    :menu-open="isOpen || undefined"
    @click="toggle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot name="button" :isOpen="isOpen" />
  </div>

  <Teleport v-if="containerRef" :to="containerRef">
    <div
      v-if="isOpen"
      ref="dropdownRef"
      class="ic-menu-dropdown"
      :style="floatingStyles"
    >
      <slot name="dropdown" :close="close" />
    </div>
  </Teleport>
</template>

<style>
.ic-menu-dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.ic-menu-dropdown {
  position: absolute;
  z-index: 10001;
}
</style>
