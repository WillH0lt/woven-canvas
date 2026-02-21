<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [color: string];
}>();

const inputValue = ref(props.modelValue ?? "");

// Sync input value when modelValue changes externally
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && newValue !== inputValue.value) {
      inputValue.value = newValue;
    }
  }
);

function isValidHex(value: string): boolean {
  const hex = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function normalizeHex(value: string): string {
  const hex = value.startsWith("#") ? value : `#${value}`;
  return hex.toLowerCase();
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  let value = target.value;

  // Auto-apply when 6 or 7 characters (valid hex) are typed
  if (value.length === 6 || value.length === 7) {
    if (isValidHex(value)) {
      const normalized = normalizeHex(value);
      inputValue.value = normalized;
      emit("update:modelValue", normalized);
    }
  }
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value;

  if (value && isValidHex(value)) {
    const normalized = normalizeHex(value);
    inputValue.value = normalized;
    emit("update:modelValue", normalized);
  } else if (props.modelValue) {
    // Reset to current valid value
    inputValue.value = props.modelValue;
  }
}

function handleKeyDown(event: KeyboardEvent) {
  // Stop propagation to prevent canvas shortcuts (e.g., Ctrl+A selecting all blocks)
  event.stopPropagation();

  if (event.key === "Enter") {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    if (value && isValidHex(value)) {
      const normalized = normalizeHex(value);
      inputValue.value = normalized;
      emit("update:modelValue", normalized);
      setTimeout(() => target.select());
    }
  }
}
</script>

<template>
  <input
    id="wov-color-input"
    class="wov-color-input"
    type="text"
    size="1"
    aria-label="Hex color value"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    :value="inputValue"
    @input="handleInput"
    @change="handleChange"
    @keydown="handleKeyDown"
  />
</template>

<style>
input.wov-color-input {
  margin-bottom: 8px;
  box-sizing: border-box;
  padding: 6px 8px;
  font-size: 18px;
  text-align: center;
  font-family: inherit;
  color: var(--wov-gray-100);
  background-color: var(--wov-gray-600);
  border: 1px solid var(--wov-gray-600);
  border-radius: 4px;
  outline: none;
}

input.wov-color-input:focus {
  border-color: var(--wov-primary);
}
</style>
