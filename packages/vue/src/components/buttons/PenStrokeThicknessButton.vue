<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@infinitecanvas/core";
import { PenStroke } from "@infinitecanvas/plugin-pen";

import MenuDropdown from "./MenuDropdown.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useComponents } from "../../composables/useComponents";
import { useEditorContext } from "../../composables/useEditorContext";

const THICKNESS_OPTIONS = [
  { label: "S", value: 4 },
  { label: "M", value: 8 },
  { label: "L", value: 16 },
] as const;

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

const strokesMap = useComponents(() => props.entityIds, PenStroke);

const currentThickness = computed<number | null>(() => {
  let first: number | null = null;
  for (const stroke of strokesMap.value.values()) {
    if (stroke) {
      if (first === null) {
        first = stroke.thickness;
      } else if (stroke.thickness !== first) {
        return null; // mixed
      }
    }
  }
  return first;
});

function handleSelect(thickness: number) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const stroke = PenStroke.write(ctx, entityId);
      stroke.thickness = thickness;
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
        class="ic-menu-option ic-pen-thickness-option"
        :class="{ 'is-active': currentThickness === option.value }"
        @click="handleSelect(option.value)"
      >
        {{ option.label }}
      </button>
    </template>
  </MenuDropdown>
</template>
