<template>
  <div
    class="relative w-full h-full bg-gray-200 cursor-auto drop-shadow-lg"
    @click.stop
    @mousedown.stop
    @mouseup.stop
    @mousemove.stop
    @dblclick.stop
    @pointerdown.stop
    @keydown.stop
    @wheel.stop
    v-on-click-outside.bubble="() => (studioStore.sideMenuKind = SideMenuKind.None)"
  >
    <div class="absolute left-0 w-96">
      <div class="relative w-full h-16 flex items-center justify-center">
        <SvgoX
          class="absolute left-4 h-6 cursor-pointer"
          @click="studioStore.sideMenuKind = SideMenuKind.None"
        />
      </div>

      <SideMenuEffectsList v-if="studioStore.sideMenuKind === SideMenuKind.Effects">
      </SideMenuEffectsList>

      <SideMenuLinkStylesList v-else-if="studioStore.sideMenuKind === SideMenuKind.LinkStyles">
      </SideMenuLinkStylesList>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { vOnClickOutside } from '@vueuse/components';

import { SideMenuKind } from '~/types/index.js';

const studioStore = useStudioStore();
</script>
