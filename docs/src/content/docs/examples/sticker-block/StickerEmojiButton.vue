<script setup lang="ts">
import { ref, computed } from 'vue'
import { MenuButton, MenuDropdown, useEditorContext, useComponents } from '@woven-canvas/vue'
import { StickerData } from './StickerData'

const props = defineProps<{
  entityIds: number[]
}>()

// Available emojis to choose from
const emojis = ['😀', '😎', '🎉', '⭐', '❤️', '🔥', '👍', '🚀', '🌈', '🎨', '💡', '✨']

// Get sticker data for all selected entities
const stickers = useComponents(() => props.entityIds, StickerData)

// Current emoji (first selected, or mixed indicator)
const currentEmoji = computed(() => {
  const values = [...stickers.value.values()].filter(Boolean).map((s) => s!.emoji)
  if (values.length === 0) return '😀'
  const allSame = values.every((e) => e === values[0])
  return allSame ? values[0] : '🔀'
})

// Dropdown state
const isOpen = ref(false)

// Editor context for writes
const { nextEditorTick } = useEditorContext()

function setEmoji(emoji: string) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const sticker = StickerData.write(ctx, entityId)
      sticker.emoji = emoji
    }
  })
  isOpen.value = false
}
</script>

<template>
  <MenuButton tooltip="Change Emoji" :menu-open="isOpen" @click="isOpen = !isOpen">
    <span style="font-size: 16px; line-height: 1">{{ currentEmoji }}</span>

    <MenuDropdown v-if="isOpen" @close="isOpen = false">
      <div class="emoji-grid">
        <button
          v-for="emoji in emojis"
          :key="emoji"
          class="emoji-option"
          :class="{ 'is-active': currentEmoji === emoji }"
          @click="setEmoji(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </MenuDropdown>
  </MenuButton>
</template>

<style scoped>
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
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
  background: rgba(0, 0, 0, 0.1);
}

.emoji-option.is-active {
  background: rgba(59, 130, 246, 0.2);
}
</style>
