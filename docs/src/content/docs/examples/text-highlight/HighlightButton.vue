<script setup lang="ts">
import { computed } from 'vue'
import { MenuDropdown, useTextFormatting } from '@woven-canvas/vue'

const props = defineProps<{
  entityIds: number[]
}>()

// woven-canvas ships no highlight feature — this drives the app-provided `highlight`
// mark (registered via `text-options` in TextHighlightExample.vue) entirely through
// the generic mark handle, which works whether the block is being edited or just
// selected.
const { commands, getMarkAttrs } = useTextFormatting(() => props.entityIds)

// Pastel swatches: light enough that black text stays readable behind the fill.
const swatches = ['#FEF08A', '#FDBA74', '#FCA5A5', '#F9A8D4', '#D8B4FE', '#A5F3FC', '#BEF264']

// Current highlight color on the selection (null if none / mixed). Reactive: getMarkAttrs
// reads the editor + selected blocks, so this recomputes on selection changes.
const currentColor = computed(() => (getMarkAttrs('highlight')?.color as string | undefined) ?? null)

function setHighlight(color: string, close: () => void) {
  commands.setMark('highlight', { color })
  close()
}

function clearHighlight(close: () => void) {
  commands.unsetMark('highlight')
  close()
}
</script>

<template>
  <MenuDropdown title="Highlight">
    <template #button>
      <div class="highlight-button">
        <div class="highlight-icon-container">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" class="highlight-icon">
            <path
              d="M349.1 114.7C343.9 103.3 332.5 96 320 96C307.5 96 296.1 103.3 290.9 114.7L123.5 480L112 480C94.3 480 80 494.3 80 512C80 529.7 94.3 544 112 544L200 544C217.7 544 232 529.7 232 512C232 494.3 217.7 480 200 480L193.9 480L215.9 432L424.2 432L446.2 480L440.1 480C422.4 480 408.1 494.3 408.1 512C408.1 529.7 422.4 544 440.1 544L528.1 544C545.8 544 560.1 529.7 560.1 512C560.1 494.3 545.8 480 528.1 480L516.6 480L349.2 114.7zM394.8 368L245.2 368L320 204.8L394.8 368z"
            />
          </svg>
          <div class="highlight-underline" :style="{ background: currentColor ?? 'transparent' }" />
        </div>
        <svg class="highlight-chevron" viewBox="0 0 512 320" fill="currentColor">
          <path
            d="M233.4 278.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 210.7 86.6 41.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"
          />
        </svg>
      </div>
    </template>

    <template #dropdown="{ close }">
      <div class="swatch-panel">
        <div class="swatch-grid">
          <button
            v-for="color in swatches"
            :key="color"
            class="swatch"
            :class="{ 'is-active': currentColor?.toLowerCase() === color.toLowerCase() }"
            :style="{ background: color }"
            @click="setHighlight(color, close)"
          />
        </div>
        <button class="clear-button" @click="clearHighlight(close)">No highlight</button>
      </div>
    </template>
  </MenuDropdown>
</template>

<style scoped>
/* Mirrors woven's built-in TextColorButton so it lines up with the other buttons. */
.highlight-button {
  display: flex;
  flex-shrink: 0;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  padding: 0 12px;
}

.highlight-icon-container {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.highlight-icon {
  width: 16px;
  height: 16px;
}

.highlight-underline {
  width: 100%;
  height: 3px;
  margin-top: 2px;
  border: 1px solid var(--wov-gray-500);
  border-radius: 1px;
}

.highlight-chevron {
  width: 7px;
  flex-shrink: 0;
  color: var(--wov-gray-300);
}

.swatch-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.swatch {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 9999px;
  outline: 1px solid #ffffff55;
  cursor: pointer;
}

.swatch.is-active {
  outline: 2px solid var(--wov-primary);
  outline-offset: 2px;
}

.clear-button {
  border: none;
  background: var(--wov-gray-600);
  color: var(--wov-gray-100);
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.clear-button:hover {
  background: var(--wov-gray-500);
}
</style>
