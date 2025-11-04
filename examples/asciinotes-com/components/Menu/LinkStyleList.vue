<template>
  <div
    ref="componentRef"
    class="bg-gray-700 w-64 text-gray-300 p-2 drop-shadow-md rounded-xl max-h-32 overflow-y-auto"
    v-on-click-outside.bubble="
      () => {
        emit('hide');
      }
    "
    @wheel.stop
  >
    <div class="flex items-center justify-center w-full mb-1" ref="addButtonRef">
      <div class="ml-2 font-bold text-white">Link Styles</div>

      <div class="ml-auto mr-1 flex items-center">
        <SvgoPlus
          class="w-8 rounded p-2 cursor-pointer hover:text-white hover:scale-105 transition-[colors,transform]"
          data-tooltip="Create Link Style"
          @click="addLinkStyle()"
        />
      </div>
    </div>

    <div
      v-for="linkStyle in studioStore.sortedLinkStyles"
      :key="linkStyle.id"
      class="w-full pl-4 mb-1"
    >
      <div
        class="group flex items-center w-full rounded py-1 cursor-pointer"
        @click="linkClassModel = linkStyle.className"
      >
        <SvgoCheck
          class="w-4 h-4 mr-2 text-gray-300 opacity-0"
          :class="{
            'opacity-100':
              linkClassModel === linkStyle.className || (defaultSelected && linkStyle.isDefault),
          }"
        />
        <div
          class="flex-1 overflow-hidden whitespace-nowrap overflow-ellipsis transition-colors"
          :class="[linkStyle.className]"
        >
          {{ linkStyle.name }}
        </div>
        <div
          class="flex items-center justify-center gap-2 px-2 opacity-0 group-hover:opacity-100 hover:text-white hover:scale-105 transition-[opacity,transform]"
        >
          <SvgoPen class="w-4 h-4" @click="showLinkStyleSideMenu(linkStyle.id)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { vOnClickOutside } from '@vueuse/components';

import { SideMenuKind } from '~/types';

const linkClassModel = defineModel<string>({ required: true });

const studioStore = useStudioStore();
const siteStore = useSiteStore();

const emit = defineEmits<{
  (e: 'hide'): void;
}>();

const addButtonRef = ref<HTMLElement | null>(null);
useTooltips(addButtonRef, 'bottom');

const componentRef = useTemplateRef('componentRef');

const defaultSelected = computed(() => linkClassModel.value === '');

async function addLinkStyle(): Promise<void> {
  if (!siteStore.currentPage) {
    console.error('No current page');
    return;
  }

  await studioStore.addLinkStyle(siteStore.currentPage.id);

  if (componentRef.value) {
    componentRef.value.scrollTop = componentRef.value.scrollHeight;
  }
}

async function showLinkStyleSideMenu(linkStyleId: string) {
  studioStore.expandedLinkStyleId = linkStyleId;
  studioStore.sideMenuKind = SideMenuKind.LinkStyles;
  studioStore.deselectAll();
}
</script>
