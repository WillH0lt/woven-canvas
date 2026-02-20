<script setup lang="ts">
import { computed } from 'vue'
import { Block } from '@woven-canvas/core'
import { useEditorContext, useQuery } from '@woven-canvas/vue'
import { Tnt, Explode } from './TntPlugin'

// Query all TNT blocks on the canvas
const tntBlocks = useQuery([Block, Tnt] as const)

// Button is disabled when no TNT exists
const isDisabled = computed(() => tntBlocks.value.length === 0)

// Get editor context to spawn commands
const { getEditor } = useEditorContext()

function handleExplode() {
  const editor = getEditor()
  if (!editor || isDisabled.value) return

  // Spawn the Explode command
  editor.command(Explode)
}
</script>

<template>
  <button class="explode-button" :class="{ disabled: isDisabled }" :disabled="isDisabled" @click="handleExplode">
    <span class="icon">💥</span>
    <span class="label">Explode</span>
    <span v-if="!isDisabled" class="count">({{ tntBlocks.length }})</span>
  </button>
</template>

<style scoped>
.explode-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.explode-button:hover:not(.disabled) {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.explode-button:active:not(.disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.explode-button.disabled {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  cursor: not-allowed;
  opacity: 0.7;
}

.icon {
  font-size: 16px;
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.count {
  font-size: 12px;
  opacity: 0.9;
}
</style>
