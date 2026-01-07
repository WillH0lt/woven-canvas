<script setup lang="ts">
import { ref, computed, inject, type Ref, watch, onUnmounted } from "vue";
import { useFloating, offset, flip, shift } from "@floating-ui/vue";
import type { EntityId } from "@infinitecanvas/editor";
import { Color } from "@infinitecanvas/editor";

import { ENTITY_REFS_KEY } from "../../blockRefs";
import MenuButton from "./MenuButton.vue";
import ColorPicker from "./ColorPicker.vue";
import ChevronDownIcon from "../../icons/ChevronDownIcon.vue";
import { useComponents } from "../../composables/useComponents";
import { rgbToHex } from "../../utils/color";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const entityRefs = inject(ENTITY_REFS_KEY);
const containerRef = inject<Ref<HTMLElement | null>>("containerRef");

// Use useComponents at setup level (not inside computed)
const colorsMap = useComponents(() => props.entityIds, Color);

// Get all selected colors as hex values
const selectedColors = computed<string[]>(() => {
  const colorSet = new Set<string>();

  for (const color of colorsMap.value.values()) {
    if (color) {
      const colorHex = rgbToHex(color);
      colorSet.add(colorHex);
    }
  }

  return Array.from(colorSet);
});

// Check if there are multiple different colors
const hasMultipleColors = computed(() => selectedColors.value.length > 1);

// Get the first color for the swatch
const currentColorHex = computed(() => {
  return selectedColors.value[0] ?? null;
});

// Style for the swatch (gradient if multiple colors)
const swatchStyle = computed(() => {
  if (selectedColors.value.length === 0) return { backgroundColor: "#000" };

  if (selectedColors.value.length >= 2) {
    const c0 = selectedColors.value[0];
    const c1 = selectedColors.value[1];
    return {
      background: `linear-gradient(45deg, ${c0} 0%, ${c0} 50%, ${c1} 50%, ${c1} 100%)`,
    };
  }

  return { backgroundColor: selectedColors.value[0] };
});

// Dropdown state
const isOpen = ref(false);
const buttonRef = ref<InstanceType<typeof MenuButton> | null>(null);
const pickerRef = ref<HTMLElement | null>(null);

// Use floating-ui for dropdown positioning
const { floatingStyles } = useFloating(
  computed(() => buttonRef.value?.buttonRef ?? null),
  pickerRef,
  {
    placement: "top",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  }
);

function togglePicker() {
  isOpen.value = !isOpen.value;
}

function closePicker() {
  isOpen.value = false;
}

function handleColorChange(colorHex: string) {
  const editor = entityRefs?.getEditor();
  if (!editor) return;

  // Apply color to all selected entities
  editor.nextTick((ctx) => {
    for (const entityId of props.entityIds) {
      Color.fromHex(ctx, entityId, colorHex);
    }
  });
}

// Close picker when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  const button = buttonRef.value?.buttonRef;
  const picker = pickerRef.value;

  if (
    button &&
    !button.contains(target) &&
    picker &&
    !picker.contains(target)
  ) {
    closePicker();
  }
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener("click", handleClickOutside, true);
  } else {
    document.removeEventListener("click", handleClickOutside, true);
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside, true);
});
</script>

<template>
  <MenuButton ref="buttonRef" title="Color" @click="togglePicker">
    <div class="ic-color-button">
      <div class="ic-color-swatch" :style="swatchStyle" />
      <ChevronDownIcon class="ic-chevron-down" />
    </div>
  </MenuButton>

  <Teleport v-if="containerRef" :to="containerRef">
    <Transition name="ic-fade">
      <div
        v-if="isOpen"
        ref="pickerRef"
        class="ic-color-picker-dropdown"
        :style="floatingStyles"
      >
        <ColorPicker
          :currentColor="currentColorHex ?? undefined"
          :hideHighlight="hasMultipleColors"
          @change="handleColorChange"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.ic-color-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  margin: 0 4px;
}

.ic-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  outline-style: solid;
  outline-width: 1px;
  outline-color: #ffffff55;
}

.ic-chevron-down {
  width: 4px;
  margin-bottom: 2px;
  color: var(--ic-gray-300);
}

.ic-color-picker-dropdown {
  position: absolute;
  z-index: 10001;
}

.ic-fade-enter-active,
.ic-fade-leave-active {
  transition: opacity 0.15s ease-out;
}

.ic-fade-enter-from,
.ic-fade-leave-to {
  opacity: 0;
}
</style>
