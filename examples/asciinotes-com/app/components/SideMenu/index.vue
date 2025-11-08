<template>
  <div class="flex flex-col w-full h-full">
    <SideMenuHeader />
    <div class="text-gray-400 text-nowrap overflow-x-hidden -mt-3 select-none">
      -------------------------------------------------
    </div>

    <div class="flex-1 text-sm overflow-y-auto">
      <div class="px-2 py-1 text-gray-400 font-bold">Pinned</div>
      <SideMenuPageList :pages="pinnedPages" rank-key="pinRank" />

      <div class="px-2 py-1 mt-8 text-gray-400 font-bold">Private</div>
      <SideMenuPageList :pages="allPages" rank-key="rank" />

      <div
        class="flex items-center group mx-2 px-2 py-1 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer select-none"
        @click="pageStore.addPageAndNavigate()"
      >
        <div class="w-7 text-center mr-3 text-xl">+</div>
        <div class="group-hover:font-bold">Add new</div>
      </div>
    </div>

    <div class="text-gray-400 text-nowrap overflow-x-hidden select-none">
      -------------------------------------------------
    </div>
    <SideMenuFooter />
  </div>
</template>

<script setup lang="ts">
import type { Page, UserPage } from "@prisma/client";
import { LexoRank } from "@dalet-oss/lexorank";

const pageStore = usePageStore();

await pageStore.fetchPages();

function getSortedPages(userPages: UserPage[]): Page[] {
  const sortedUserPages = userPages.sort((a, b) => {
    const rankA = LexoRank.parse(a.pinRank ?? a.rank);
    const rankB = LexoRank.parse(b.pinRank ?? b.rank);
    return rankA.compareTo(rankB);
  });

  return sortedUserPages
    .map((up) => pageStore.pages.find((p) => p.id === up.pageId))
    .filter((p): p is Page => p !== undefined);
}

const pinnedPages = computed(() => {
  const userPages = pageStore.userPages.filter((up) => up.pinRank !== null);

  return getSortedPages(userPages);
});

const allPages = computed(() => {
  return getSortedPages(pageStore.userPages);
});
</script>
