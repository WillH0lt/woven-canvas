<script setup lang="ts">
import { computed } from "vue";
import { type EntityId, Shape, StrokeKind } from "@woven-canvas/core";

import MenuDropdown from "./MenuDropdown.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useComponents } from "../../composables/useComponents";
import { useEditorContext } from "../../composables/useEditorContext";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

const shapesMap = useComponents(() => props.entityIds, Shape);

// Get the current stroke style
const currentStyle = computed(() => {
  const first = shapesMap.value.values().next().value;
  return first?.strokeKind ?? StrokeKind.Solid;
});

// Check if multiple different styles are selected
const hasMultipleStyles = computed(() => {
  const styles = new Set<StrokeKind>();
  for (const shape of shapesMap.value.values()) {
    if (shape) {
      styles.add(shape.strokeKind);
    }
  }
  return styles.size > 1;
});

// Available stroke styles
const strokeOptions: { kind: StrokeKind; label: string }[] = [
  { kind: StrokeKind.Solid, label: "Solid" },
  { kind: StrokeKind.Dashed, label: "Dashed" },
  { kind: StrokeKind.None, label: "None" },
];

function handleStyleChange(kind: StrokeKind) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const shape = Shape.write(ctx, entityId);
      shape.strokeKind = kind;
    }
  });
}

// Get dash array for preview
function getDashArray(kind: StrokeKind): string {
  switch (kind) {
    case StrokeKind.Dashed:
      return "6 6";
    case StrokeKind.Solid:
    case StrokeKind.None:
    default:
      return "";
  }
}
</script>

<template>
  <MenuDropdown title="Stroke Style">
    <template #button>
      <div class="wov-stroke-style-button">
        <svg viewBox="0 0 24 8" class="wov-stroke-style-icon" fill="none" stroke="currentColor" stroke-width="2">
          <line
            x1="2"
            y1="4"
            x2="22"
            y2="4"
            stroke-linecap="round"
            :stroke-dasharray="getDashArray(currentStyle)"
            :stroke-opacity="currentStyle === StrokeKind.None ? 0.3 : 1"
          />
        </svg>
        <IconChevronDown class="wov-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="wov-stroke-style-dropdown">
        <button
          v-for="option in strokeOptions"
          :key="option.kind"
          class="wov-stroke-style-option"
          :class="{ 'is-selected': !hasMultipleStyles && option.kind === currentStyle }"
          @click="handleStyleChange(option.kind)"
        >
          <svg viewBox="0 0 40 8" class="wov-stroke-style-preview" fill="none" stroke="currentColor" stroke-width="2">
            <line
              x1="4"
              y1="4"
              x2="36"
              y2="4"
              stroke-linecap="round"
              :stroke-dasharray="getDashArray(option.kind)"
              :stroke-opacity="option.kind === StrokeKind.None ? 0.3 : 1"
            />
          </svg>
          <span>{{ option.label }}</span>
        </button>
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.wov-stroke-style-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 6px;
  margin: 0 8px;
}

.wov-stroke-style-icon {
  width: 24px;
  height: 8px;
}

.wov-stroke-style-dropdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
  min-width: 140px;
}

.wov-stroke-style-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--wov-gray-100);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
}

.wov-stroke-style-option:hover {
  background: var(--wov-gray-600);
}

.wov-stroke-style-option.is-selected {
  background: var(--wov-primary-600);
}

.wov-stroke-style-preview {
  width: 40px;
  height: 8px;
}
</style>
