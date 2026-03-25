<script setup lang="ts">
import { ref, watch, nextTick, inject, type Ref } from 'vue'
import type { EntityId } from '@woven-canvas/core'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'

import MenuButton from '../MenuButton.vue'
import { useTextFormatting } from '../../../composables/useTextFormatting'

const props = defineProps<{
  entityIds: EntityId[]
}>()

const { state, commands } = useTextFormatting(() => props.entityIds)

const isOpen = ref(false)
const linkValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

// Get container ref from WovenCanvas for teleport
const containerRef = inject<Ref<HTMLElement | null>>('containerRef')

// Floating positioning
const { floatingStyles } = useFloating(buttonRef, dropdownRef, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})

function openLinkInput() {
  linkValue.value = state.linkHref ?? ''
  isOpen.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function applyLink() {
  const href = linkValue.value.trim()
  if (href) {
    commands.setLink(href)
  } else {
    commands.removeLink()
  }
  isOpen.value = false
}

function removeLink() {
  commands.removeLink()
  linkValue.value = ''
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (!buttonRef.value?.contains(target) && !dropdownRef.value?.contains(target)) {
    isOpen.value = false
  }
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('click', handleClickOutside, true)
  } else {
    document.removeEventListener('click', handleClickOutside, true)
  }
})
</script>

<template>
  <div ref="buttonRef">
    <MenuButton
      v-if="state.showTextMenuButtons"
      title="Link"
      :class="{ 'wov-active': state.linkHref !== null }"
      @click="openLinkInput"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 640 512"
        fill="currentColor"
      >
        <path
          d="M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 7-34.4-7.4-44.6s-34.4-7-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372.1 74 321.1 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.8l-1.1 1.6c-10.3 14.4-7 34.4 7.4 44.6s34.4 7 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z"
        />
      </svg>
    </MenuButton>
  </div>

  <Teleport v-if="containerRef" :to="containerRef">
    <div
      v-if="isOpen"
      ref="dropdownRef"
      class="wov-link-input-dropdown"
      :style="floatingStyles"
      @keydown.stop
    >
      <div class="wov-link-input-container">
        <input
          ref="inputRef"
          v-model="linkValue"
          class="wov-link-input"
          placeholder="Paste or type URL"
          @keydown.enter.prevent="applyLink"
          @keydown.esc.prevent="isOpen = false"
        />
        <button
          v-if="linkValue || state.linkHref"
          class="wov-link-action-button"
          title="Remove link"
          @click="removeLink"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 512"
            fill="currentColor"
          >
            <path
              d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 12.5 32.8 0 45.3s32.8 12.5 45.3 0L237.3 256 342.6 150.6z"
            />
          </svg>
        </button>
        <button
          class="wov-link-action-button"
          title="Apply link"
          @click="applyLink"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
            fill="currentColor"
          >
            <path
              d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style>
.wov-link-input-dropdown {
  position: absolute;
  z-index: var(--wov-z-dropdown);
  pointer-events: auto;
}

.wov-link-input-container {
  display: flex;
  align-items: center;
  height: 40px;
  background-color: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.wov-link-input {
  width: 280px;
  height: 100%;
  padding: 0 12px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--wov-gray-100);
  font-size: 14px;
}

.wov-link-input::placeholder {
  color: var(--wov-gray-400);
}

.wov-link-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--wov-gray-100);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.wov-link-action-button:hover {
  background-color: var(--wov-gray-600);
}

.wov-link-action-button svg {
  width: 14px;
  height: 14px;
}
</style>
