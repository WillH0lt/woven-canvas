<script setup lang="ts">
import { computed } from 'vue'
import type { EntityId } from '@woven-canvas/core'
import { Asset } from '@woven-canvas/core'

import MenuDropdown from './MenuDropdown.vue'
import IconChevronDown from '../icons/IconChevronDown.vue'
import { useComponents } from '../../composables/useComponents'
import { useEditorContext } from '../../composables/useEditorContext'

const TAPE_OPTIONS = [
  {
    name: 'Masking Tape',
    url: 'https://storage.googleapis.com/download/storage/v1/b/zine-maker-public/o/tapes%2F7e3b7dde-927d-4b09-aeb4-d49eac36d4ea.png?generation=1715183194653465&alt=media',
  },
  {
    name: 'Transparent',
    url: 'https://storage.googleapis.com/download/storage/v1/b/zine-maker-public/o/tapes%2F522899b7-0ae9-4303-bdca-71105d835210.png?generation=1715183195130528&alt=media',
  },
  {
    name: 'Arabic',
    url: 'https://storage.googleapis.com/download/storage/v1/b/zine-maker-public/o/tapes%2F3658d208-67e9-48a4-865b-44842187b523.png?generation=1715183192038109&alt=media',
  },
  {
    name: 'Balloons',
    url: 'https://storage.googleapis.com/download/storage/v1/b/zine-maker-public/o/tapes%2F7d836c56-ae9a-44e6-a624-e6a49286dcde.png?generation=1715183193267076&alt=media',
  },
  {
    name: 'Flowers',
    url: 'https://storage.googleapis.com/download/storage/v1/b/zine-maker-public/o/tapes%2Fc1a1b89a-543f-4817-8afa-76544e94d776.png?generation=1715183194007112&alt=media',
  },
]

const props = defineProps<{
  entityIds: EntityId[]
}>()

const { nextEditorTick } = useEditorContext()

const assetsMap = useComponents(() => props.entityIds, Asset)

const currentUrl = computed(() => {
  for (const asset of assetsMap.value.values()) {
    if (asset?.identifier) return asset.identifier
  }
  return null
})

function selectTape(url: string) {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const asset = Asset.write(ctx, entityId)
      asset.identifier = url
    }
  })
}
</script>

<template>
  <MenuDropdown title="Tape Style">
    <template #button>
      <div class="wov-tape-image-button">
        <div
          class="wov-tape-image-swatch"
          :style="currentUrl ? { backgroundImage: `url(${currentUrl})` } : {}"
        />
        <IconChevronDown class="wov-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <div class="wov-tape-image-bubbles">
        <div
          v-for="tape in TAPE_OPTIONS"
          :key="tape.url"
          class="wov-tape-image-bubble"
          :class="{ selected: currentUrl === tape.url }"
          :style="{ backgroundImage: `url(${tape.url})` }"
          @mousedown.prevent
          @click="selectTape(tape.url)"
        />
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.wov-tape-image-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  margin: 0 8px;
}

.wov-tape-image-swatch {
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background-size: cover;
  background-position: center;
  background-color: rgba(220, 200, 160, 0.5);
  outline-style: solid;
  outline-width: 1px;
  outline-color: #ffffff55;
}

.wov-tape-image-bubbles {
  color: var(--wov-gray-100);
  background-color: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 8px;
  padding: 8px;
}

.wov-tape-image-bubble {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  background-size: cover;
  background-position: center;
  outline-style: solid;
  outline-width: 1px;
  outline-color: #ffffff55;
  cursor: pointer;
}

.wov-tape-image-bubble.selected {
  outline-width: 2px;
  outline-color: var(--wov-primary);
  outline-offset: 2px;
}
</style>
