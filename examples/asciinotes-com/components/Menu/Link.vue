<template>
  <div v-on-click-outside.bubble="() => emit('hide')">
    <div
      class="flex w-[450px] h-10 bg-gray-700 text-white pointer-events-auto cursor-auto drop-shadow-md rounded-l-xl [&>*:first-child]:rounded-l-xl [&>*:first-child]:[&>*:first-child]:ml-1 rounded-r-xl [&>*:last-child]:rounded-r-xl [&>*:last-child]:[&>*:last-child]:mr-1"
      @keydown.enter.prevent="hideLinkInput"
      @keydown.esc.prevent="hideLinkInput"
      @keydown.stop
      @wheel.stop
    >
      <div
        ref="pageListButtonRef"
        class="flex items-center justify-center gap-2 h-full px-3 text-gray-300 hover:text-gray-100 border-r border-gray-500 cursor-pointer"
        @click.stop="pageListVisible = !pageListVisible"
      >
        pages
        <SvgoChevronDown class="w-2" />
      </div>
      <div class="flex-1 flex mx-2">
        <input
          ref="linkInputRef"
          class="w-full px-2 py-3 ml-2 bg-gray-700 text-center border-none focus:ring-0"
          v-model="linkRef"
          placeholder="Type or paste URL"
        />
      </div>

      <MenuButton @click="removeLink" v-if="linkRef !== ''">
        <SvgoX class="w-4" />
      </MenuButton>
      <MenuButton @click="hideLinkInput">
        <SvgoCheck class="w-4" />
      </MenuButton>
      <MenuButton
        ref="styleListButtonRef"
        v-if="linkClassModel !== undefined"
        @click.stop="styleListVisible = !styleListVisible"
      >
        <SvgoPalette class="w-4" />
      </MenuButton>
    </div>
    <div ref="pageListRef" v-if="pageListVisible" :style="pageListStyles">
      <MenuPageList @select="handleSelectPage" @hide="pageListVisible = false" />
    </div>

    <div
      ref="styleListRef"
      v-if="styleListVisible && linkClassModel !== undefined"
      :style="styleListStyles"
    >
      <MenuLinkStyleList
        v-model="linkClassModel"
        @update="handleSelectLinkStyle"
        @hide="styleListVisible = false"
      />
      <!-- @select="handleSelectLinkStyle" -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { vOnClickOutside } from '@vueuse/components';

import type { Page, LinkStyle } from '@prisma/client';

const linkModel = defineModel<string>('link', { required: true });
const linkClassModel = defineModel<string>('linkClass', { required: false });

const linkRef = ref(linkModel.value);

const linkInputRef = useTemplateRef('linkInputRef');

const emit = defineEmits(['hide']);

const pageListButtonRef = useTemplateRef('pageListButtonRef');
const pageListRef = useTemplateRef('pageListRef');
const pageListVisible = ref(false);
const { floatingStyles: pageListStyles } = useMenus(pageListButtonRef, pageListRef, {
  placement: 'top',
  offset: 2,
});

const styleListButtonRef = ref<HTMLElement | null>(null);
const styleListRef = useTemplateRef('styleListRef');
const styleListVisible = ref(false);
const { floatingStyles: styleListStyles } = useMenus(styleListButtonRef, styleListRef, {
  placement: 'top',
  offset: 2,
});

watch(styleListVisible, (value) => {
  if (value) pageListVisible.value = false;
});

watch(pageListVisible, (value) => {
  if (value) styleListVisible.value = false;
});

onMounted(() => {
  linkInputRef.value?.focus();
});

function removeLink() {
  linkModel.value = '';
  emit('hide');
}

function hideLinkInput() {
  linkModel.value = linkRef.value;
  emit('hide');
}

function handleSelectPage(page: Page) {
  pageListVisible.value = false;

  // TODO, links should update automatically when paths change
  // this happens on the server, but it also needs to happen on the client
  linkRef.value = `/${page.path}`;
}

function handleSelectLinkStyle(linkStyle: LinkStyle) {
  styleListVisible.value = false;

  linkClassModel.value = linkStyle.className;
}
</script>
