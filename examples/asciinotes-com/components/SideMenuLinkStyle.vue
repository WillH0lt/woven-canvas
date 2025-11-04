<template>
  <div class="flex flex-col bg-white rounded-lg p-2 text-black font-bold drop-shadow text-gray-600">
    <div class="flex items-center px-2 gap-3">
      <SvgoChevronRight
        class="h-4 cursor-pointer hover:scale-110 transition-transform"
        :class="{
          'rotate-90': expanded,
        }"
      />
      <div class="select-none" :class="[linkStyle.className]">{{ linkStyle.name }}</div>
      <div v-if="expanded" class="ml-auto">
        <SvgoTrash
          v-if="!linkStyle.isDefault"
          class="h-4 cursor-pointer text-gray-500 hover:scale-110 transition-transform"
          @click="studioStore.removeLinkStyle(linkStyle)"
        />
      </div>
      <!-- <SvgoHandle
        v-else
        class="ml-auto h-4 cursor-grab text-gray-400 hover:scale-110 transition-transform"
      /> -->
    </div>
    <div class="flex flex-col gap-4 pt-8 pb-3 px-7 font-normal" v-if="expanded" @click.stop>
      <div class="flex items-center justify-center w-full">
        <div class="mr-auto font-bold">Color</div>
        <ElementColorPicker
          v-model="linkStyle.color"
          @blur="studioStore.updateLinkStyle(linkStyle)"
        />
      </div>
      <div class="flex items-center justify-center w-full">
        <div class="mr-auto font-bold">Underline</div>
        <ElementToggle v-model="isUnderlined" @update="studioStore.updateLinkStyle(linkStyle)" />
      </div>

      <div class="flex items-center justify-center w-full">
        <div class="mr-auto font-bold">Hover Color</div>
        <ElementColorPicker
          v-model="linkStyle.hoverColor"
          @blur="studioStore.updateLinkStyle(linkStyle)"
        />
      </div>
      <div class="flex items-center justify-center w-full">
        <div class="mr-auto font-bold">Hover Underline</div>
        <ElementToggle
          v-model="isHoverUnderlined"
          @update="studioStore.updateLinkStyle(linkStyle)"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { TextDecoration } from '@prisma/client';
import type { LinkStyle } from '@prisma/client';

const props = defineProps<{
  linkStyle: LinkStyle;
  expanded: boolean;
}>();

const studioStore = useStudioStore();

const isUnderlined = computed({
  get: () => props.linkStyle.decoration === TextDecoration.Underline,
  set: (value: boolean) => {
    props.linkStyle.decoration = value ? TextDecoration.Underline : TextDecoration.None;
  },
});

const isHoverUnderlined = computed({
  get: () => props.linkStyle.hoverDecoration === TextDecoration.Underline,
  set: (value: boolean) => {
    props.linkStyle.hoverDecoration = value ? TextDecoration.Underline : TextDecoration.None;
  },
});
</script>
