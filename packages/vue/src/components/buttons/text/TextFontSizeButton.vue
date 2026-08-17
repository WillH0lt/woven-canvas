<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EntityId } from '@woven-canvas/core'

import MenuDropdown from '../MenuDropdown.vue'
import IconChevronDown from '../../icons/IconChevronDown.vue'
import { useTextFormatting } from '../../../composables/useTextFormatting'
import { DEFAULT_FONT_SIZE_OPTIONS, type FontSizeOption } from './fontSizeOptions'

const props = withDefaults(
  defineProps<{
    entityIds: EntityId[]
    /** Preset sizes offered above the custom-size box. */
    sizeOptions?: FontSizeOption[]
  }>(),
  { sizeOptions: () => DEFAULT_FONT_SIZE_OPTIONS },
)

const { state, commands } = useTextFormatting(() => props.entityIds)

const inputRef = ref<HTMLInputElement | null>(null)

/** Floor for the steppers, so repeated clicks can't reach 0 or negative sizes. */
const MIN_STEP_SIZE_PX = 1

// Get current font size (null if mixed)
const currentFontSize = computed<number | null>(() => state.fontSize)

// Label for the button
const buttonLabel = computed(() => {
  const size = currentFontSize.value
  if (size === null) return 'Mixed'

  const option = props.sizeOptions.find((o) => o.value === size)
  if (option) return option.label

  return `${+size.toFixed(1)} px`
})

// Display value for the input (shows current font size)
const inputDisplayValue = computed(() => {
  const size = currentFontSize.value
  if (size === null) return ''
  return String(+size.toFixed(1))
})

function setFontSize(value: number) {
  commands.setFontSize(value)
}

/**
 * Commit on `change` (Enter / blur), not per keystroke: backspacing `24` down to
 * `2` on the way to `28` would otherwise apply a 2px font, which reads as the
 * text vanishing.
 */
function handleInputCommit(e: Event) {
  const input = e.target as HTMLInputElement
  const value = Number.parseFloat(input.value)

  if (Number.isNaN(value) || value <= 0) {
    // Unusable entry — put the size that's actually applied back in the box.
    input.value = inputDisplayValue.value
    return
  }

  setFontSize(value)
}

/**
 * Nudge the size by 1px, from whatever the box shows — so stepping picks up an
 * entry the user typed but hasn't committed yet.
 */
function stepFontSize(delta: number) {
  const typed = Number.parseFloat(inputRef.value?.value ?? '')
  const base = Number.isNaN(typed) ? currentFontSize.value : typed
  if (base === null) return // mixed sizes and an empty box: nothing to step from

  const size = Math.max(+(base + delta).toFixed(1), MIN_STEP_SIZE_PX)
  // `inputDisplayValue` doesn't change when the box already showed the stepped
  // size (an uncommitted entry), so write the box back by hand.
  if (inputRef.value) inputRef.value.value = String(size)
  setFontSize(size)
}

function handleInputKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    ;(e.target as HTMLInputElement).blur()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    stepFontSize(1)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    stepFontSize(-1)
  }
}

function handleWheelStop(e: Event) {
  e.stopPropagation()
}
</script>

<template>
  <MenuDropdown v-if="state.showTextMenuButtons" title="Font Size">
    <template #button>
      <div class="wov-font-size-button">
        <span class="wov-font-size-label">{{ buttonLabel }}</span>
        <IconChevronDown class="wov-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <!-- `keydown.stop` keeps the custom-size box's keystrokes out of the canvas
           keybinds — without it Backspace deletes the selected block. -->
      <div
        class="wov-font-size-menu"
        @wheel="handleWheelStop"
        @click.stop
        @keydown.stop
      >
        <div
          v-for="option in sizeOptions"
          :key="option.value"
          class="wov-font-size-option"
          :class="{ active: currentFontSize === option.value }"
          @click="setFontSize(option.value)"
        >
          <svg
            v-if="currentFontSize === option.value"
            class="wov-check-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
            fill="currentColor"
          >
            <path
              d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"
            />
          </svg>
          <span
            class="wov-option-label"
            :style="{ fontSize: `${option.displayValue}px` }"
          >
            {{ option.label }}
          </span>
        </div>

        <div class="wov-separator" />

        <div class="wov-input-container">
          <input
            ref="inputRef"
            class="wov-custom-input"
            :value="inputDisplayValue"
            @change="handleInputCommit"
            @keydown="handleInputKeyDown"
            placeholder="Custom size"
          />
          <span class="wov-px-suffix">px</span>
          <!-- `mousedown.prevent` keeps the caret in the box while stepping -->
          <div class="wov-size-stepper">
            <button
              class="wov-size-stepper-button"
              title="Increase size"
              @mousedown.prevent
              @click="stepFontSize(1)"
            >
              <svg
                class="wov-size-stepper-icon up"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 320"
                fill="currentColor"
              >
                <path
                  d="M233.4 278.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 210.7 86.6 41.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"
                />
              </svg>
            </button>
            <button
              class="wov-size-stepper-button"
              title="Decrease size"
              @mousedown.prevent
              @click="stepFontSize(-1)"
            >
              <svg
                class="wov-size-stepper-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 320"
                fill="currentColor"
              >
                <path
                  d="M233.4 278.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 210.7 86.6 41.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.wov-font-size-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  user-select: none;
  height: 100%;
  gap: 8px;
  padding: 0 12px;
}

.wov-font-size-label {
  font-size: 14px;
  white-space: nowrap;
}

.wov-font-size-menu {
  background-color: var(--wov-gray-700);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  border-radius: 8px;
  cursor: pointer;
  width: 150px;
}

.wov-font-size-menu > *:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.wov-font-size-option {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 32px;
  transition: background-color 0.2s;
}

.wov-font-size-option.active {
  background-color: var(--wov-primary);
}

.wov-font-size-option:not(.active):hover {
  background-color: var(--wov-gray-600);
}

.wov-check-icon {
  color: white;
  width: 16px;
  margin-right: 8px;
  margin-left: -24px;
}

.wov-option-label {
  color: white;
}

.wov-separator {
  margin: 4px 0;
  width: 100%;
  height: 0.75px;
  background-color: var(--wov-gray-600);
}

.wov-input-container {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
}

.wov-custom-input {
  background-color: var(--wov-gray-700);
  width: 100%;
  margin: 8px;
  border-radius: 6px;
  border: none;
  padding: 8px;
  /* Room for the px suffix and the stepper arrows */
  padding-right: 44px;
  color: white;
  font-size: 14px;
  outline: 1px solid var(--wov-gray-600);
}

.wov-custom-input:hover {
  outline: 1px solid var(--wov-gray-500);
}

.wov-custom-input:focus {
  outline: 2px solid var(--wov-primary);
}

.wov-px-suffix {
  position: absolute;
  right: 34px;
  color: var(--wov-gray-400);
  font-size: 14px;
}

.wov-size-stepper {
  display: flex;
  position: absolute;
  right: 13px;
  flex-direction: column;
  gap: 1px;
}

.wov-size-stepper-button {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 15px;
  height: 11px;
  border-radius: 3px;
  border: none;
  background-color: transparent;
  padding: 0;
  color: var(--wov-gray-400);
}

.wov-size-stepper-button:hover {
  background-color: var(--wov-gray-600);
  color: white;
}

.wov-size-stepper-icon {
  width: 7px;
}

.wov-size-stepper-icon.up {
  transform: rotate(180deg);
}
</style>
