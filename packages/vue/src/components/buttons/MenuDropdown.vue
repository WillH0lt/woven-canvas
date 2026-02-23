<script setup lang="ts">
import { ref, inject, provide, watch, onUnmounted, type Ref } from "vue";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/vue";
import { DROPDOWN_ACTIVE_KEY, DROPDOWN_LEVEL_KEY } from "../../injection";
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

// Get container ref from WovenCanvas for teleport
const containerRef = inject<Ref<HTMLElement | null>>("containerRef");

// Dropdown level coordination - only one dropdown open per level
const activeByLevel = inject(DROPDOWN_ACTIVE_KEY, null);
const level = inject(DROPDOWN_LEVEL_KEY, 0);
const instanceId = Math.random().toString(36).slice(2);

// Provide incremented level for nested dropdowns
provide(DROPDOWN_LEVEL_KEY, level + 1);

// Tooltip singleton
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton();

// Dropdown state
const isOpen = ref(false);

// Close this dropdown if another one at the same level becomes active
if (activeByLevel) {
  watch(
    () => activeByLevel.value.get(level),
    (activeId) => {
      if (activeId !== undefined && activeId !== instanceId && isOpen.value) {
        isOpen.value = false;
      }
    }
  );
}
const buttonRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

// Use floating-ui for dropdown positioning
const { floatingStyles } = useFloating(buttonRef, dropdownRef, {
  placement: props.placement,
  middleware: [offset(props.offsetPx), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
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

  // Check if click is inside this dropdown's button or content
  const isInsideButton = buttonRef.value?.contains(target);
  const isInsideDropdown = dropdownRef.value?.contains(target);

  // Check if click is inside any nested dropdown (teleported elsewhere)
  const isInsideAnyDropdown = (target as Element).closest?.(".wov-menu-dropdown");

  if (!isInsideButton && !isInsideDropdown && !isInsideAnyDropdown) {
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
    // Set this dropdown as active at its level (closes others at same level)
    if (activeByLevel) {
      activeByLevel.value.set(level, instanceId);
      // Trigger reactivity
      activeByLevel.value = new Map(activeByLevel.value);
    }
    emit("open");
  } else {
    document.removeEventListener("click", handleClickOutside, true);
    // Clear active at this level if this was the active dropdown
    if (activeByLevel?.value.get(level) === instanceId) {
      activeByLevel.value.delete(level);
      activeByLevel.value = new Map(activeByLevel.value);
    }
    emit("close");
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside, true);
});
</script>

<template>
  <div
    ref="buttonRef"
    class="wov-menu-dropdown-trigger"
    :class="{ 'is-open': isOpen }"
    :menu-open="isOpen || undefined"
    @mousedown.prevent
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
      class="wov-menu-dropdown"
      :style="floatingStyles"
    >
      <slot name="dropdown" :close="close" />
    </div>
  </Teleport>
</template>

<style>
.wov-menu-dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.wov-menu-dropdown {
  position: absolute;
  z-index: var(--wov-z-dropdown);
}
</style>
