<script setup lang="ts">
import {
  BringForwardSelected,
  type CommandDef,
  DuplicateSelected,
  RemoveSelected,
  SendBackwardSelected,
} from '@woven-canvas/core'

import MenuDropdown from './MenuDropdown.vue'
import { useEditorContext } from '../../composables/useEditorContext'

interface Operation {
  label: string
  command: CommandDef<void>
  /** SVG path data, rendered as 24x24 stroked paths (lucide style) */
  iconPaths: string[]
  danger?: boolean
}

const OPERATIONS: Operation[] = [
  {
    label: 'Duplicate',
    command: DuplicateSelected,
    iconPaths: [
      'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z',
      'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
    ],
  },
  {
    label: 'Bring forward',
    command: BringForwardSelected,
    iconPaths: ['M5 3h14', 'm18 13-6-6-6 6', 'M12 7v14'],
  },
  {
    label: 'Send backward',
    command: SendBackwardSelected,
    iconPaths: ['M12 17V3', 'm6 11 6 6 6-6', 'M19 21H5'],
  },
  {
    label: 'Delete',
    command: RemoveSelected,
    iconPaths: [
      'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
      'M3 6h18',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    ],
    danger: true,
  },
]

const { getEditor } = useEditorContext()

function runOperation(operation: Operation, close: () => void) {
  getEditor()?.command(operation.command)
  close()
}
</script>

<template>
  <MenuDropdown title="More">
    <template #button>
      <div class="wov-block-operations-button">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      </div>
    </template>

    <template #dropdown="{ close }">
      <div class="wov-block-operations-dropdown">
        <button
          v-for="operation in OPERATIONS"
          :key="operation.label"
          class="wov-block-operations-option"
          :class="{ 'is-danger': operation.danger }"
          @click="runOperation(operation, close)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path v-for="d in operation.iconPaths" :key="d" :d="d" />
          </svg>
          <span>{{ operation.label }}</span>
        </button>
      </div>
    </template>
  </MenuDropdown>
</template>

<style>
.wov-block-operations-button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0 8px;
}

.wov-block-operations-button svg {
  width: 18px;
  height: 18px;
}

.wov-block-operations-dropdown {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  background: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
  min-width: 160px;
}

.wov-block-operations-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--wov-gray-100);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  text-align: left;
}

.wov-block-operations-option:hover {
  background: var(--wov-gray-600);
}

.wov-block-operations-option svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.wov-block-operations-option.is-danger:hover {
  color: var(--wov-error);
}
</style>
