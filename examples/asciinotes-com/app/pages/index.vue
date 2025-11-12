<template>
  <div class="flex w-full h-screen">
    <div
      class="overflow-hidden transition-[width] duration-500"
      :class="appStore.sideMenuOpen ? 'w-80' : 'w-0'"
    >
      <div
        class="w-80 transition-transform duration-500"
        :class="appStore.sideMenuOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <SideMenu class="bg-gray-100 h-screen" />
      </div>
    </div>

    <div
      class="flex-1 relative flex items-center justify-center pointer-events-none"
    >
      <StudioView class="pointer-events-auto" />
      <div class="flex absolute top-0 left-0 m-2">
        <UTooltip
          :text="appStore.sideMenuOpen ? 'Close sidebar' : 'Open sidebar'"
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
          :content="{
            align: 'start',
          }"
          @update:open="(isOpen: boolean) => {
            if (!isOpen && pageStore.activePage) {
              savePage(pageStore.activePage);
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
    </div>
  </div>

  <div class="absolute top-0 right-0 m-4">
    <UButton
      v-if="appStore.isAnonymous"
      @click="loginModal.open()"
      class="cursor-pointer"
      color="primary"
      size="lg"
      variant="solid"
    >
      Sign in
    </UButton>

    <UPopover v-else modal>
      <UButton class="cursor-pointer" color="primary" size="lg" variant="solid">
        Share
      </UButton>
      <template #content>
        <PopoverSharePage
          v-if="pageStore.activePage"
          :page="pageStore.activePage"
        />
      </template>
    </UPopover>
  </div>
</template>

<script lang="ts" setup>
import type { User } from "firebase/auth";

import type { Page } from "#shared/prisma/browser";
import { ModalLogin, ModalTerms } from "#components";

const overlay = useOverlay();
const loginModal = overlay.create(ModalLogin);
const termsModal = overlay.create(ModalTerms);

const currentUser = useCurrentUser();
const appStore = useAppStore();
const auth = useFirebaseAuth()!;

async function handleSignIn(): Promise<void> {
  loginModal.close();

  const user = await appStore.fetchUserData();
  if (!user.acceptedTerms && !appStore.isAnonymous) {
    termsModal.open();
  }
}

watch(
  currentUser,
  async (currUser, prevUser) => {
    if (!prevUser && currUser) {
      await handleSignIn();
      return;
    }

    if (!currUser || !prevUser || currUser.uid === prevUser.uid) return;

    const prevAnonymous = isAnonymous(prevUser);
    const currAnonymous = isAnonymous(currUser);

    if (prevAnonymous && !currAnonymous) {
      await handleSignIn();
    }
  },
  { immediate: true }
);

function isAnonymous(user: User): boolean {
  return user.providerData.length === 0 || user.isAnonymous;
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
</script>
