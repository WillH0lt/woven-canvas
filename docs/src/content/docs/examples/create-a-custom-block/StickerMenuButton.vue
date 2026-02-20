<script setup lang="ts">
import { computed } from 'vue'
import { MenuDropdown, useComponents, useEditorContext } from '@woven-canvas/vue'
import { Sticker } from './Sticker'

const props = defineProps<{
  entityIds: number[]
}>()

// Available emojis to choose from
const emojis = ['😀', '😎', '🎉', '⭐', '❤️', '🔥', '👍', '🚀', '🌈', '🎨', '💡', '✨']

// Get sticker data for all selected entities
const stickers = useComponents(() => props.entityIds, Sticker)

// Current emoji (first selected, or mixed indicator)
const currentEmoji = computed(() => {
  const values = [...stickers.value.values()].map((s) => s?.emoji)
  if (values.length === 0) return '😀'
  const allSame = values.every((e) => e === values[0])
  return allSame ? values[0] : '🔀'
})

// Editor context for writes
const { nextEditorTick } = useEditorContext()

function setEmoji(emoji: string, close: () => void) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const sticker = Sticker.write(ctx, entityId)
      sticker.emoji = emoji
    }
  })
  close()
}
</script>

<template>
  <MenuDropdown title="Sticker">
    <template #button>
      <div class="emoji-button">
        <span class="emoji-display">{{ currentEmoji }}</span>
        <span class="chevron">▾</span>
      </div>
    </template>

    <template #dropdown="{ close }">
      <div class="emoji-grid">
        <button
          v-for="emoji in emojis"
          :key="emoji"
          class="emoji-option"
          :class="{ 'is-active': currentEmoji === emoji }"
          @click="setEmoji(emoji, close)"
        >
          {{ emoji }}
        </button>
      </div>
    </template>
  </MenuDropdown>
</template>

<style scoped>
.emoji-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  padding: 0 8px;
}

.emoji-display {
  font-size: 16px;
  line-height: 1;
}

.chevron {
  font-size: 12px;
  line-height: 1;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
  background: var(--ic-gray-700);
  border-radius: var(--ic-menu-border-radius);
}

.emoji-option {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.emoji-option:hover {
  background: var(--ic-gray-600);
}

.emoji-option.is-active {
  background: var(--ic-primary);
}
</style>
