<template>
  <ElementNotification v-if="appStore.notification" :text="appStore.notification" />

  <div class="w-full">
    <div class="flex items-center gap-4 px-4 py-2 max-w-screen-2xl mx-auto text-xl text-white">
      <routerLink class="cursor-pointer" to="/">
        <SvgoIceCream class="h-12" />
      </routerLink>

      <routerLink class="cursor-pointer mr-auto" to="/">
        <div class="text-3xl font-bold text-primary font-logo">ScrollyPage</div>
      </routerLink>

      <ElementButton @click="addSite" :loading="addingSite"> + Create </ElementButton>
      <div
        ref="avatarRef"
        class="flex items-center h-full cursor-pointer rounded-r-full shrink-0"
        @click="userMenuVisible = !userMenuVisible"
      >
        <img
          v-if="profileStore.profile"
          class="w-10 h-10 rounded-full bg-primary shadow"
          :src="profileStore.profile.photoUrl"
        />
        <SvgoAvatar v-else class="w-10 h-10 rounded-full bg-primary shadow" />
      </div>
    </div>
  </div>

  <Transition name="popdown">
    <HomeUserMenu
      class="absolute mt-4 z-10"
      :style="{
        top: `${avatarRef?.getBoundingClientRect().bottom}px`,
        right: `${width - (avatarRef?.getBoundingClientRect().right ?? 0)}px`,
      }"
      v-if="userMenuVisible"
      @close="userMenuVisible = false"
    />
  </Transition>

  <slot></slot>
</template>

<script lang="ts" setup>
import { ModalView } from '~/types';

const { width } = useWindowSize();
const { $client } = useNuxtApp();
const router = useRouter();
const appStore = useAppStore();
const profileStore = useProfileStore();

const avatarRef = useTemplateRef('avatarRef');
const userMenuVisible = ref(false);

const addingSite = ref(false);
async function addSite() {
  addingSite.value = true;
  try {
    const site = await $client.site.create.mutate();
    const pageId = site.pages[0].id;
    await router.push({
      name: 'studio-pageId',
      params: { pageId },
    });
  } catch (error) {
    console.error('Failed to add site', error);
  } finally {
    addingSite.value = false;
  }
}

router.beforeEach(async (to, from) => {
  appStore.modalView = ModalView.None;
  return true;
});
</script>

<style>
body {
  background-color: var(--color-gray-200);
}

.font-logo {
  font-family: 'Lobster Two', cursive;
}
</style>
