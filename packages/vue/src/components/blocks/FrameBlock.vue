<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorContext } from '../../composables/useEditorContext'
import { useComponent } from '../../composables/useComponent'
import { Frame, FrameDropTarget } from '@woven-canvas/core'
import type { BlockData } from '../../types'

const props = defineProps<BlockData>()

const { nextEditorTick } = useEditorContext()

const frame = useComponent(props.entityId, Frame)
const dropTarget = useComponent(props.entityId, FrameDropTarget)

const isDropTarget = computed(() => dropTarget.value !== null)

const label = computed(() => frame.value?.label ?? 'Frame')

// Counter-flip the entire frame block so the label stays at the visual top-left.
// The frame border is symmetric so the flip has no visible effect on it.
const blockStyle = computed(() => {
  const [flipX, flipY] = props.block.flip
  if (!flipX && !flipY) return undefined
  return {
    transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
  }
})

const labelRef = ref<HTMLElement | null>(null)

function finishEditing() {
  const newLabel = labelRef.value?.textContent?.trim() || 'Frame'
  if (newLabel === label.value) return
  nextEditorTick((ctx) => {
    const writable = Frame.write(ctx, props.entityId)
    writable.label = newLabel
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === 'Escape') {
    e.preventDefault()
    labelRef.value?.blur()
  }
  e.stopPropagation()
}
</script>

<template>
  <div class="wov-frame-block" :style="blockStyle">
    <div class="wov-frame-border" :class="{ 'wov-frame-border--hovered': props.hovered, 'wov-frame-border--selected': props.selected, 'wov-frame-border--drop-target': isDropTarget }" />
    <div
      ref="labelRef"
      class="wov-frame-label"
      contenteditable="true"
      @blur="finishEditing"
      @keydown="handleKeydown"
    >
      {{ label }}
    </div>
  </div>
</template>

<style>
.wov-frame-block {
  position: relative;
  width: 100%;
  height: 100%;
}

.wov-frame-border {
  position: absolute;
  inset: 0;
  background: white;
  border: none;
  pointer-events: none;
  outline: 2px solid #333;
}

.wov-frame-border--hovered {
  outline-color: var(--wov-primary);
}

.wov-frame-border--selected {
  outline-color: var(--wov-primary);
}

.wov-frame-border--drop-target {
  outline-color: var(--wov-primary);
}

.wov-frame-label {
  position: absolute;
  top: -24px;
  left: 0;
  font-size: 14px;
  font-family: 'Figtree', sans-serif;
  font-weight: 700;
  color: #333;
  padding: 2px 8px;
  cursor: text;
  white-space: nowrap;
  outline: none;
  line-height: 1;
  pointer-events: auto;
}
</style>
