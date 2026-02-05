<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@infinitecanvas/editor";
import { PenStroke } from "@infinitecanvas/plugin-pen";

import MenuDropdown from "./MenuDropdown.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useComponents } from "../../composables/useComponents";
import { useEditorContext } from "../../composables/useEditorContext";

const THICKNESS_OPTIONS = [
  { label: "Thin", value: 4 },
  { label: "Medium", value: 8 },
  { label: "Thick", value: 16 },
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

const currentLabel = computed(() => {
  if (currentThickness.value === null) return "Mixed";
  const option = THICKNESS_OPTIONS.find(
    (o) => o.value === currentThickness.value,
  );
  return option?.label ?? `${currentThickness.value}`;
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
      <div class="ic-thickness-button">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-line-squiggle-icon lucide-line-squiggle"
        >
          <path
            d="M7 3.5c5-2 7 2.5 3 4C1.5 10 2 15 5 16c5 2 9-10 14-7s.5 13.5-4 12c-5-2.5.5-11 6-2"
          />
        </svg>
        <IconChevronDown class="ic-chevron-down" />
      </div>
    </template>

    <template #dropdown="{ close }">
      <div class="ic-thickness-dropdown">
        <button
          v-for="option in THICKNESS_OPTIONS"
          :key="option.value"
          class="ic-thickness-option"
          :class="{ 'is-active': currentThickness === option.value }"
          @click="
            handleSelect(option.value);
            close();
          "
        >
          <svg
            viewBox="0 0 24 16"
            fill="currentColor"
            class="ic-thickness-preview"
          >
            <rect
              x="2"
              :y="8 - option.value / 4"
              width="20"
              :height="Math.max(option.value / 2, 1.5)"
              rx="1"
            />
          </svg>
          <span>{{ option.label }}</span>
        </button>
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.ic-thickness-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  margin: 0 8px;
}

.ic-thickness-icon {
  width: 20px;
  height: 12px;
}

.ic-thickness-dropdown {
  display: flex;
  flex-direction: column;
  background-color: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
  padding: 4px;
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
  min-width: 120px;
}

.ic-thickness-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--ic-gray-100);
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.ic-thickness-option:hover {
  background-color: var(--ic-gray-600);
}

.ic-thickness-option.is-active {
  background-color: var(--ic-gray-600);
}

.ic-thickness-preview {
  width: 24px;
  height: 16px;
  flex-shrink: 0;
}
</style>
