<script setup lang="ts">
import { StrokeKind } from "@infinitecanvas/plugin-shapes";

defineProps<{
  currentStyle: StrokeKind;
  hasMultipleStyles: boolean;
}>();

const emit = defineEmits<{
  change: [kind: StrokeKind];
}>();

const strokeOptions: { kind: StrokeKind; label: string }[] = [
  { kind: StrokeKind.Solid, label: "Solid" },
  { kind: StrokeKind.Dashed, label: "Dashed" },
  { kind: StrokeKind.None, label: "None" },
];

function getDashArray(kind: StrokeKind): string {
  switch (kind) {
    case StrokeKind.Dashed:
      return "6 6";
    case StrokeKind.None:
      return "";
    case StrokeKind.Solid:
    default:
      return "";
  }
}

function handleClick(kind: StrokeKind) {
  emit("change", kind);
}
</script>

<template>
  <div class="ic-stroke-style-section">
    <button
      v-for="option in strokeOptions"
      :key="option.kind"
      class="ic-stroke-style-option"
      :class="{
        'is-active': !hasMultipleStyles && option.kind === currentStyle,
      }"
      :title="option.label"
      @click="handleClick(option.kind)"
    >
      <svg
        viewBox="0 0 24 8"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line
          x1="2"
          y1="4"
          x2="22"
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

<style>
.ic-stroke-style-section {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  margin-bottom: -2px;
}

.ic-stroke-style-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  padding: 6px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0;
  color: var(--ic-gray-100);
  font-size: 11px;
}

.ic-stroke-style-option:first-child {
  border-top-left-radius: 8px;
}

.ic-stroke-style-option:last-child {
  border-top-right-radius: 8px;
}

.ic-stroke-style-option:hover {
  background: var(--ic-gray-700);
}

.ic-stroke-style-option.is-active {
  background: var(--ic-gray-600);
}

.ic-stroke-style-option svg {
  width: 32px;
  height: 12px;
}
</style>
