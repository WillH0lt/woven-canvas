<template>
  <StudioOverlay>
    <div
      ref="container"
      class="flex items-center justify-center h-10 bg-gray-700 text-white pointer-events-auto cursor-auto drop-shadow-md rounded-l-xl [&>*:first-child]:rounded-l-xl [&>*:first-child]:[&>*:first-child]:ml-1 rounded-r-xl [&>*:last-child]:rounded-r-xl [&>*:last-child]:[&>*:last-child]:mr-1"
      v-if="studioStore.sideMenuKind === SideMenuKind.None"
    >
      <component v-if="contextMenuComponent" :is="contextMenuComponent" />

      <MenuDivider v-if="contextMenuComponent" />

      <MenuButton
        v-if="propertiesButtonVisible"
        data-tooltip="Animate"
        @click="studioStore.sideMenuKind = SideMenuKind.Effects"
      >
        <SvgoFilm class="w-4" />
      </MenuButton>

      <MenuButton data-tooltip="Bring Forward" @click="studioStore.bringSelectedPartsForward">
        <SvgoArrowUp class="w-4" />
      </MenuButton>
      <MenuButton data-tooltip="Send Backward" @click="studioStore.sendSelectedPartsBackward">
        <SvgoArrowDown class="w-4" />
      </MenuButton>
      <MenuButton data-tooltip="Duplicate" @click="studioStore.duplicateSelectedParts">
        <SvgoClone class="w-4" />
      </MenuButton>
      <MenuButton data-tooltip="Delete" @click="studioStore.deleteSelectedParts">
        <SvgoTrash class="w-4" />
      </MenuButton>
    </div>
  </StudioOverlay>
</template>

<script setup lang="ts">
import type { ConcreteComponent } from 'vue';
import { PartTag } from '@prisma/client';

import { SideMenuKind } from '~/types/index.js';

const studioStore = useStudioStore();
const containerRef = useTemplateRef('container');
useTooltips(containerRef, 'top');

let keysDown = new Set<string>();

function handleKeyDown(event: KeyboardEvent) {
  keysDown.add(event.key);

  if (keysDown.has('Control') && event.key === 'z') {
    if (studioStore.selectedPart) {
      studioStore.updatePartInStudioNosnapshot(studioStore.selectedPart);
    }
    studioStore.undo();
    event.stopImmediatePropagation();
  } else if (
    (keysDown.has('Control') && event.key === 'y') ||
    (keysDown.has('Control') && keysDown.has('Shift') && event.key === 'Z')
  ) {
    if (studioStore.selectedPart) {
      studioStore.updatePartInStudioNosnapshot(studioStore.selectedPart);
    }
    studioStore.redo();
    event.stopImmediatePropagation();
  }
}

function handleKeyUp(event: KeyboardEvent) {
  keysDown.delete(event.key);
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('keyup', handleKeyUp, { capture: true });
});

onUnmounted(() => {
  for (const selectedPartId of studioStore.selectedParts) {
    const part = studioStore.parts.find((part) => part.id === selectedPartId);
    if (part) studioStore.updatePartInStudio(part);
  }

  window.removeEventListener('keydown', handleKeyDown, { capture: true });
  window.removeEventListener('keyup', handleKeyUp, { capture: true });
});

const contextMenuComponent = computed(() => {
  let component: ConcreteComponent | string | null = null;

  if (studioStore.selectedParts.length > 1) {
    component = resolveComponent('MenuTransformBoxButtons');
  } else if (studioStore.selectedPart?.tag === PartTag.Shape) {
    component = resolveComponent('MenuShapeButtons');
  } else if (studioStore.selectedPart?.tag === PartTag.Note) {
    component = resolveComponent('MenuNoteButtons');
  } else if (studioStore.selectedPart?.tag === PartTag.Button) {
    component = resolveComponent('MenuButtonButtons');
  }

  return component;
});

const propertiesButtonVisible = computed(() => {
  return studioStore.selectedParts.length === 1 || studioStore.selectedGroup !== null;
});
</script>
