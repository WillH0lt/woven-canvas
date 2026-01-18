<script setup lang="ts">
import { computed, useSlots, inject, onUnmounted } from "vue";

import ColorButton from "./buttons/ColorButton.vue";
import MenuTooltip from "./buttons/MenuTooltip.vue";
import TextBoldButton from "./buttons/text/TextBoldButton.vue";
import TextItalicButton from "./buttons/text/TextItalicButton.vue";
import TextUnderlineButton from "./buttons/text/TextUnderlineButton.vue";
import TextAlignmentButton from "./buttons/text/TextAlignmentButton.vue";
import TextFontSizeButton from "./buttons/text/TextFontSizeButton.vue";
import TextFontFamilyButton from "./buttons/text/TextFontFamilyButton.vue";
import TextColorButton from "./buttons/text/TextColorButton.vue";
import { useTooltipSingleton } from "../composables/useTooltipSingleton";
import { FLOATING_MENU_KEY } from "../injection";

const slots = useSlots();
const { reset: resetTooltip } = useTooltipSingleton();
const context = inject(FLOATING_MENU_KEY)!;
const { selectedIds, commonComponents } = context;

// Built-in component names (handled in template)
const builtInComponentNames = new Set(["color", "text"]);

// Custom slots for components not covered by built-ins
const customButtons = computed(() => {
  const buttons: string[] = [];
  for (const component of commonComponents.value) {
    const slotName = `button:${component}`;
    if (!builtInComponentNames.has(component) && slots[slotName]) {
      buttons.push(component);
    }
  }
  return buttons;
});

function handleMouseLeave() {
  resetTooltip();
}

onUnmounted(() => {
  resetTooltip();
});
</script>

<template>
  <div class="ic-floating-menu-bar" @mouseleave="handleMouseLeave">
    <!-- Custom buttons via slots -->
    <template v-for="component in customButtons" :key="component">
      <slot :name="`button:${component}`" :entityIds="selectedIds" />
    </template>

    <!-- Built-in buttons with slot overrides -->
    <slot name="button:color" :entityIds="selectedIds">
      <ColorButton
        v-if="commonComponents.has('color')"
        :entityIds="selectedIds"
      />
    </slot>

    <!-- Text formatting buttons -->
    <slot name="button:text" :entityIds="selectedIds">
      <template v-if="commonComponents.has('text')">
        <TextFontFamilyButton :entityIds="selectedIds" />
        <TextFontSizeButton :entityIds="selectedIds" />
        <div divider class="ic-divider" />
        <TextBoldButton :entityIds="selectedIds" />
        <TextItalicButton :entityIds="selectedIds" />
        <TextUnderlineButton :entityIds="selectedIds" />
        <div divider class="ic-divider" />
        <TextColorButton :entityIds="selectedIds" />
        <TextAlignmentButton :entityIds="selectedIds" />
      </template>
    </slot>

    <!-- Singleton tooltip rendered once for all menu items -->
    <MenuTooltip />
  </div>
</template>

<style>
.ic-floating-menu-bar {
  display: flex;
  overflow: hidden;
  cursor: pointer;
  height: 40px;
  color: var(--ic-gray-100);
  background-color: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
}

.ic-floating-menu-bar > *:first-child {
  border-top-left-radius: var(--ic-menu-border-radius);
  border-bottom-left-radius: var(--ic-menu-border-radius);
}

.ic-floating-menu-bar > *:last-child {
  border-top-right-radius: var(--ic-menu-border-radius);
  border-bottom-right-radius: var(--ic-menu-border-radius);
}

.ic-floating-menu-bar > * {
  width: 100%;
  height: 100%;
  transition-property: background-color;
  transition-timing-function: var(--ic-transition-timing-function);
  transition-duration: var(--ic-transition-duration);
}

.ic-floating-menu-bar > *:hover:not([divider]) {
  background-color: var(--ic-gray-600);
}

.ic-floating-menu-bar > *[menu-open] {
  background-color: var(--ic-gray-600);
}

.ic-floating-menu-bar > .ic-active:hover {
  background: var(--ic-primary-light);
}

.ic-divider {
  width: 1px !important;
  height: 24px !important;
  margin: auto 0;
  background-color: var(--ic-gray-600);
  flex-shrink: 0;
}
</style>
