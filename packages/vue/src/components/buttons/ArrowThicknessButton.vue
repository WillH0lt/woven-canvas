<script setup lang="ts">
import { shallowRef } from "vue";
import { hasComponent, type EntityId } from "@infinitecanvas/core";
import { ElbowArrow, ArcArrow } from "@infinitecanvas/plugin-arrows";

import MenuDropdown from "./MenuDropdown.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useEditorContext } from "../../composables/useEditorContext";

const THICKNESS_OPTIONS = [
  { label: "S", value: 2 },
  { label: "M", value: 4 },
  { label: "L", value: 8 },
] as const;

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

const currentThickness = shallowRef<number | null>(null);

// Update current thickness on each tick
nextEditorTick((ctx) => {
  let first: number | null = null;

  for (const entityId of props.entityIds) {
    if (hasComponent(ctx, entityId, ElbowArrow)) {
      const arrow = ElbowArrow.read(ctx, entityId);
      if (first === null) {
        first = arrow.thickness;
      } else if (arrow.thickness !== first) {
        currentThickness.value = null;
        return;
      }
    }
    if (hasComponent(ctx, entityId, ArcArrow)) {
      const thickness = ArcArrow.getThickness(ctx, entityId);
      if (first === null) {
        first = thickness;
      } else if (thickness !== first) {
        currentThickness.value = null;
        return;
      }
    }
  }

  currentThickness.value = first;
});

function handleSelect(thickness: number) {
  currentThickness.value = thickness;

  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      if (hasComponent(ctx, entityId, ElbowArrow)) {
        const arrow = ElbowArrow.write(ctx, entityId);
        arrow.thickness = thickness;
      }
      if (hasComponent(ctx, entityId, ArcArrow)) {
        ArcArrow.setThickness(ctx, entityId, thickness);
      }
    }
  });
}
</script>

<template>
  <MenuDropdown title="Thickness">
    <template #button>
      <div class="ic-menu-button">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
        >
          <line x1="4" y1="5" x2="20" y2="5" stroke-width="1" />
          <line x1="4" y1="11" x2="20" y2="11" stroke-width="2.5" />
          <line x1="4" y1="19" x2="20" y2="19" stroke-width="4" />
        </svg>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <button
        v-for="option in THICKNESS_OPTIONS"
        :key="option.value"
        class="ic-menu-option ic-arrow-thickness-option"
        :class="{ 'is-active': currentThickness === option.value }"
        @click="handleSelect(option.value)"
      >
        {{ option.label }}
      </button>
    </template>
  </MenuDropdown>
</template>
