<template>
  <div
    class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 p-4 w-full max-w-[1152px] mx-auto"
  >
    <div class="relative w-full aspect-[3/4] group" v-for="site of sites" :key="site.id">
      <div class="w-full h-full flex flex-col gap-4 group">
        <img
          class="object-cover w-full h-full rounded-lg bg-white cursor-pointer group-hover:shadow-lg group-hover:-translate-y-4 transition-[box-shadow,transform] duration-500"
          :src="sitePreview(site)"
          @click="router.push(studioRoute(site))"
        />
        <div class="flex justify-between">
          <div class="flex-1 overflow-hidden">
            <div class="text-lg font-bold overflow-ellipsis overflow-hidden whitespace-nowrap">
              {{ site.name }}
            </div>
            <div class="text-gray-500">
              edited {{ site.editedAt ? useTimeAgo(site.editedAt) : 'never' }}
            </div>
          </div>

          <div class="w-10">
            <ElementDropdown
              class="ml-auto pl-2 transition-opacity text-lg"
              :class="{
                'opacity-0 group-hover:opacity-100': selectedSite !== site,
              }"
              :menuItems="getSiteMenuItems(site)"
              size="medium"
              @show="() => (selectedSite = site)"
              @hide="() => (selectedSite = null)"
            >
              <SvgoEllipsis />
            </ElementDropdown>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    class="flex items-center justify-center w-full h-full mt-32 text-gray-500 text-2xl"
    v-if="sites.length === 0"
  >
    <div class="flex flex-col items-center gap-8 bg-primary-light p-8 rounded-xl drop-shadow-lg">
      <!-- <div class="text-3xl font-bold">It's empty here</div> -->
      <img
        class="w-32 h-32"
        src="https://storage.googleapis.com/scrolly-page-stickers/transhumans/Reflecting.svg"
      />
      <ElementButton @click="addSite" :loading="addingSite">
        + Create your first site
      </ElementButton>
    </div>
  </div>
  <ElementDialog
    v-if="siteToDelete"
    @close="siteToDelete = null"
    text="Are you sure want to Delete this site?"
    :buttons="[
      {
        text: 'Cancel',
        onClick: () => (siteToDelete = null),
      },
      {
        text: 'Delete',
        onClick: async () => {
          await deleteSite(siteToDelete!.id);
          siteToDelete = null;
        },
      },
    ]"
  ></ElementDialog>

  <SiteView
    class="-z-10 overflow-hidden !pointer-events-none !touch-none !opacity-40"
    path="sites"
  />
</template>

<script setup lang="ts">
import omit from 'lodash.omit';
import type { Site } from '@prisma/client';

import type { MenuItem } from '~/types/index.js';

const { $client } = useNuxtApp();

const response = await $client.site.getAll.query();
// const sites = ref<Site[]>([]);
const sites = ref(response.map((site) => omit(site, ['pages'])));
const pages = ref(response.flatMap((site) => site.pages));

const siteToDelete = ref<Site | null>(null);
const selectedSite = ref<Site | null>(null);

const router = useRouter();
function getSiteMenuItems(site: Site): MenuItem[] {
  const items = [
    {
      text: 'Edit',
      onClick: () => router.push(studioRoute(site)),
    },
    {
      text: 'Settings',
      onClick: () => router.push(studioRoute(site) + '/settings/general'),
    },
    {
      text: 'Delete',
      onClick: () => (siteToDelete.value = site),
    },
  ];

  return items;
}

function studioRoute(site: Site) {
  const sitePages = pages.value.filter((page) => page.siteId === site.id);
  return `/studio/${sitePages[0].id}`;
}

function sitePreview(site: Site) {
  const sitePages = pages.value.filter((page) => page.siteId === site.id);
  return sitePages[0].previewImage || '/img/blank.png';
}

async function deleteSite(id: string) {
  await $client.site.delete.mutate(id);

  sites.value = sites.value.filter((s) => s.id !== id);
  pages.value = pages.value.filter((p) => p.siteId !== id);
}

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

function handleWheel(e: WheelEvent) {
  e.stopImmediatePropagation();
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { capture: true, passive: true });
});

onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel, { capture: true });
});
</script>
