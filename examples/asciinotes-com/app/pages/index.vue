<template>
  <div class="absolute top-0 right-0 m-4">
    <UPopover
      v-if="currentUser"
      modal
      @update:open="(isOpen: boolean) => {
        // if (!isOpen) {
        //   savePage(page);
        // }
      }"
    >
      <UButton color="primary" size="lg" variant="solid"> Share </UButton>
      <template #content>
        <PopoverSharePage />
      </template>
    </UPopover>

    <RouterLink v-else to="/signin">
      <UButton color="primary" size="lg" variant="solid"> Sign in </UButton>
    </RouterLink>
  </div>

  <div class="flex w-full h-screen">
    <div
      class="overflow-hidden transition-[width] duration-500"
      :class="sideMenuVisible ? 'w-80' : 'w-0'"
    >
      <div
        class="w-80 transition-transform duration-500"
        :class="sideMenuVisible ? 'translate-x-0' : '-translate-x-full'"
      >
        <SideMenu class="bg-gray-100 h-screen" />
      </div>
    </div>

    <div
      class="flex-1 relative flex items-center justify-center pointer-events-none"
    >
      <div class="flex absolute top-0 left-0 m-2">
        <UTooltip
          v-if="currentUser"
          :text="sideMenuVisible ? 'Close sidebar' : 'Open sidebar'"
          class="pointer-events-auto"
        >
          <UButton
            class="cursor-pointer hover:bg-gray-200"
            @click="appStore.sideMenuOpen = !appStore.sideMenuOpen"
            icon="i-lucide-panel-left"
            size="lg"
            color="neutral"
            variant="ghost"
          ></UButton>
        </UTooltip>

        <UPopover
          class="pointer-events-auto ml-1"
          v-if="pageStore.activePage"
          modal
          @update:open="(isOpen: boolean) => {
            if (!isOpen) {
              savePage(pageStore.activePage!);
            }
          }"
        >
          <div
            class="flex-1 flex items-center cursor-pointer pl-1 pr-2 hover:font-bold hover:bg-gray-200 rounded-lg"
          >
            <div class="w-7 text-center mr-1">
              {{ pageStore.activePage?.icon }}
            </div>
            <div class="mr-auto overflow-x-hidden text-ellipsis">
              {{ pageStore.activePage?.name }}
            </div>
          </div>

          <template #content>
            <PopoverRenamePage
              v-model:name="pageStore.activePage.name"
              v-model:icon="pageStore.activePage.icon"
            />
          </template>
        </UPopover>
      </div>
      <div class="bg-primary w-20 h-20"></div>
      <NuxtPage />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Page } from "@prisma/client";

const currentUser = useCurrentUser();

const appStore = useAppStore();
const sideMenuVisible = computed(() => {
  return currentUser && appStore.sideMenuOpen;
});

const pageStore = usePageStore();
async function savePage(page: Page): Promise<void> {
  await pageStore.updatePage({
    pageId: page.id,
    updates: {
      name: page.name,
      icon: page.icon,
    },
  });
}
</script>
