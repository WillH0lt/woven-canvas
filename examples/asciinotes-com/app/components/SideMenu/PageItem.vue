<template>
  <div
    class="flex items-center group relative mx-2 px-2 py-1 hover:bg-gray-200 rounded-lg transition-colors text-nowrap overflow-x-hidden select-none"
    :class="{
      'bg-gray-200': menuOpen || isBeingDragged || isActivePage,
    }"
  >
    <UPopover
      modal
      v-model:open="renamePopoverOpen"
      @update:open="(isOpen: boolean) => {
        if (!isOpen) {
          savePage(page);
        }
      }"
    >
      <template #anchor>
        <router-link
          :to="`/p/${page.id}`"
          class="flex-1 flex items-center cursor-pointer hover:font-bold min-w-0"
          draggable="false"
        >
          <div class="w-7 text-center mr-3 text-xl">{{ page.icon }}</div>
          <div class="flex items-center mr-auto overflow-hidden min-w-0">
            <div class="flex-1 truncate">
              {{ page.name }}
            </div>
            <UTooltip
              v-if="getUserPage(page)?.isPinned"
              text="pinned"
              :content="{
                align: 'center',
                side: 'right',
                sideOffset: 8,
              }"
            >
              <UIcon class="size-4 text-gray-400 mx-2" name="i-lucide-pin" />
            </UTooltip>
          </div>
        </router-link>
      </template>
      <template #content>
        <PopoverRenamePage v-model:name="page.name" v-model:icon="page.icon" />
      </template>
    </UPopover>

    <UDropdownMenu
      :items="getMenuItems(page)"
      @update:open="(isOpen: boolean) => {
        menuOpen = isOpen;
      }"
    >
      <UButton
        class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        :class="{
          'opacity-0!': isBeingDragged,
        }"
        icon="i-lucide-more-horizontal"
        size="xs"
        color="neutral"
        variant="ghost"
      />
    </UDropdownMenu>
  </div>
</template>

<script lang="ts" setup>
import type { Page } from "@prisma/client";

import { ModalDeletePage } from "#components";

const props = defineProps<{
  page: Page;
  isBeingDragged: boolean;
}>();

const route = useRoute();

const menuOpen = ref(false);
const renamePopoverOpen = ref(false);
const isActivePage = computed(() => route.params.pageId === props.page.id);

const overlay = useOverlay();
const deleteModal = overlay.create(ModalDeletePage);

function getMenuItems(page: Page) {
  const userPage = pageStore.userPages.find(
    (up) => up.pageId === props.page.id
  );

  if (!userPage) return [];

  const groupA = [];

  if (userPage.isPinned) {
    groupA.push({
      label: "Unpin",
      icon: "i-lucide-pin-off",
      onSelect: () => pageStore.unpinUserPage(props.page.id),
    });
  } else {
    groupA.push({
      label: "Pin",
      icon: "i-lucide-pin",
      onSelect: () => pageStore.pinUserPage(props.page.id),
    });
  }

  groupA.push(
    {
      label: "Rename",
      icon: "i-lucide-edit",
      onSelect: () => (renamePopoverOpen.value = true),
    }
    // {
    //   label: "Duplicate",
    //   icon: "i-lucide-copy",
    //   onSelect: () => pageStore.duplicatePage(props.page.id),
    // }
  );

  const groupB = [
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      onSelect: () => deletePage(props.page.id),
    },
  ];

  return [groupA, groupB];
}

const pageStore = usePageStore();
async function savePage(page: Page): Promise<void> {
  await pageStore.updatePageName({
    pageId: page.id,
    updates: {
      name: page.name,
      icon: page.icon,
    },
  });
}

async function deletePage(pageId: string): Promise<void> {
  const confirmed = await deleteModal.open();
  if (confirmed) {
    await pageStore.deletePage(pageId);
  }
}

function getUserPage(page: Page) {
  return pageStore.userPages.find((up) => up.pageId === page.id);
}
</script>
