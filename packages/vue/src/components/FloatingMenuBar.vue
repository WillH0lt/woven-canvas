<script setup lang="ts">
import { computed, type Component } from "vue";
import type { EntityId } from "@infinitecanvas/editor";

import ColorButton from "./buttons/ColorButton.vue";
import Divider from "./buttons/Divider.vue";
import MenuTooltip from "./buttons/MenuTooltip.vue";
import { useTooltipSingleton } from "../composables/useTooltipSingleton";

const props = defineProps<{
  selectedIds: EntityId[];
  commonComponents: Set<string>;
}>();

const { reset: resetTooltip } = useTooltipSingleton();

// Built-in button definitions, ordered by priority
// Each entry maps a component name to its button
const builtInButtons: Array<{
  component: string;
  order: number;
  default: Component;
}> = [{ component: "color", order: 10, default: ColorButton }];

// Filter to only components present in selection, sorted by order
const activeButtons = computed(() =>
  builtInButtons
    .filter((b) => props.commonComponents.has(b.component))
    .sort((a, b) => a.order - b.order)
);

function handleMouseLeave() {
  resetTooltip();
}
</script>

<template>
  <div class="ic-floating-menu-bar" @mouseleave="handleMouseLeave">
    <template v-for="(button, index) in activeButtons" :key="button.component">
      <Divider v-if="index > 0" />

      <!-- Allow slot override, fall back to default component -->
      <slot :name="button.component" :entityIds="selectedIds">
        <component :is="button.default" :entityIds="selectedIds" />
      </slot>
    </template>

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
  box-shadow: 0px 0px 0.5px rgba(0, 0, 0, 0.18), 0px 3px 8px rgba(0, 0, 0, 0.1),
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
</style>
