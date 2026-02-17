<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@woven-canvas/core";
import { Shape } from "../../Shape";
import { SHAPES } from "../../shapes";

import MenuDropdown from "./MenuDropdown.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useComponents } from "../../composables/useComponents";
import { useEditorContext } from "../../composables/useEditorContext";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

const shapesMap = useComponents(() => props.entityIds, Shape);

// Get the current shape kind
const currentKind = computed(() => {
  const first = shapesMap.value.values().next().value;
  return first?.kind ?? "rectangle";
});

// Check if multiple different kinds are selected
const hasMultipleKinds = computed(() => {
  const kinds = new Set<string>();
  for (const shape of shapesMap.value.values()) {
    if (shape) {
      kinds.add(shape.kind);
    }
  }
  return kinds.size > 1;
});

// Available shape kinds with labels (derived from SHAPES constant)
const shapeOptions = computed(() =>
  Object.keys(SHAPES).map((kind) => ({
    kind,
    label: kind.charAt(0).toUpperCase() + kind.slice(1),
  }))
);

function handleKindChange(kind: string) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shapeData = Shape.write(ctx, entityId);
      shapeData.kind = kind;
    }
  });
}
</script>

<template>
  <MenuDropdown title="Shape Type">
    <template #button>
      <div class="ic-shape-kind-button">
        <svg
          viewBox="0 0 20 20"
          class="ic-shape-kind-icon"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <circle cx="6" cy="6" r="5" />
          <rect x="6" y="6" width="10" height="10" fill="var(--ic-gray-600)" />
        </svg>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="ic-shape-kind-dropdown">
        <button
          v-for="option in shapeOptions"
          :key="option.kind"
          class="ic-shape-kind-option"
          :class="{
            'is-selected': !hasMultipleKinds && option.kind === currentKind,
          }"
          @click="handleKindChange(option.kind)"
        >
          <svg
            viewBox="0 0 20 20"
            class="ic-shape-option-icon"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
          >
            <path
              :d="SHAPES[option.kind]"
              transform="translate(2, 2) scale(0.16)"
            />
          </svg>
          <span>{{ option.label }}</span>
        </button>
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.ic-shape-kind-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 6px;
  margin: 0 8px;
}

.ic-shape-kind-icon {
  width: 18px;
  height: 18px;
}

.ic-shape-kind-dropdown {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 8px;
  background: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
  min-width: 200px;
}

.ic-shape-kind-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--ic-gray-100);
  cursor: pointer;
  border-radius: 4px;
  font-size: 10px;
}

.ic-shape-kind-option:hover {
  background: var(--ic-gray-600);
}

.ic-shape-kind-option.is-selected {
  background: var(--ic-primary-600);
}

.ic-shape-option-icon {
  width: 24px;
  height: 24px;
}
</style>
