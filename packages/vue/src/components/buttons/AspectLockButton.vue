<script setup lang="ts">
import { computed } from 'vue'
import { Block, type EntityId, ResizeMode, TransformBoxStateSingleton, UpdateTransformBox } from '@woven-canvas/core'

import MenuButton from './MenuButton.vue'
import { useComponents } from '../../composables/useComponents'
import { useEditorContext } from '../../composables/useEditorContext'
import { useSingleton } from '../../composables/useSingleton'

const props = defineProps<{
  entityIds: EntityId[]
}>()

const { nextEditorTick } = useEditorContext()

const transformBoxState = useSingleton(TransformBoxStateSingleton)
const blocks = useComponents(() => props.entityIds, Block)

// Aspect is locked unless a block has explicitly opted into free resizing.
// `default` defers to the block def, which is `scale` for images.
const isLocked = computed(() => {
  for (const block of blocks.value.values()) {
    if (block?.resizeMode === ResizeMode.Free) return false
  }
  return true
})

function toggleLock() {
  // Unlocking is an explicit override; locking clears it so the block follows
  // its block def again.
  const resizeMode = isLocked.value ? ResizeMode.Free : ResizeMode.Default

  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const block = Block.write(ctx, entityId)
      block.resizeMode = resizeMode
    }

    // Handle kinds are derived from the resize mode, so the box has to rebuild
    // them before the next drag.
    const { transformBoxId } = transformBoxState.value
    if (transformBoxId !== null) {
      UpdateTransformBox.spawn(ctx, { transformBoxId })
    }
  })
}
</script>

<template>
  <MenuButton :title="isLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'" @click="toggleLock">
    <!-- Lucide's fullscreen. The icon carries the state on its own, so the
         image sits in a fixed frame and only the corners change: brackets when
         locked, diagonal arrows splaying outward when unlocked. Corner marks
         have the room to differ coarsely, which survives 18px. -->
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="7" y="8" width="10" height="8" rx="1" />
      <template v-if="isLocked">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      </template>
      <template v-else>
        <path d="M3 6V3h3" />
        <path d="m6 6-3-3" />
        <path d="M21 6V3h-3" />
        <path d="m18 6 3-3" />
        <path d="M3 18v3h3" />
        <path d="m6 18-3 3" />
        <path d="M21 18v3h-3" />
        <path d="m18 18 3 3" />
      </template>
    </svg>
  </MenuButton>
</template>
