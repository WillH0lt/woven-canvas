<template>
  <div ref="containerRef">
    <div
      v-for="{ slotId, itemId, item: page } in slottedItems"
      class="mb-0.5"
      :key="slotId"
      :data-swapy-slot="slotId"
    >
      <div :key="itemId" :data-swapy-item="itemId">
        <SideMenuPageItem
          :page="page!"
          :is-being-dragged="draggedPageId === page?.id"
        >
        </SideMenuPageItem>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Page } from "@prisma/client";
import { createSwapy, utils } from "swapy";
import type { Swapy, SlotItemMapArray } from "swapy";
import { LexoRank } from "@dalet-oss/lexorank";

const { pages } = defineProps<{
  pages: Page[];
}>();

const pageStore = usePageStore();

const swapy = ref<Swapy | null>(null);
const containerRef = useTemplateRef("containerRef");
const draggedPageId = ref<string | null>(null);

onMounted(() => {
  swapy.value = createSwapy(containerRef.value!, {
    manualSwap: true,
    dragAxis: "y",
    autoScrollOnDrag: true,
  });
  swapy.value.onSwap((event) => {
    requestAnimationFrame(() => {
      slotItemMap.value = event.newSlotItemMap.asArray;
    });
  });

  swapy.value.onSwapStart((event) => {
    draggedPageId.value = event.draggingItem;
  });

  swapy.value.onSwapEnd((event) => {
    if (!event.hasChanged || draggedPageId.value === null) return;

    const arr = event.slotItemMap.asArray;
    if (pages.length <= 1) return;

    const movedPage = pages.find(
      (page: Page) => page.id === draggedPageId.value
    );
    if (!movedPage) return;

    const movedIndex = arr.findIndex(
      (item) => item.item === draggedPageId.value
    );

    let rank: string;
    if (movedIndex === 0) {
      const nextPage = pages.find((page: Page) => page.id === arr[1]?.item)!;
      rank = getPageRank(nextPage).genPrev().toString();
    } else if (movedIndex === pages.length - 1) {
      const prevPage = pages.find(
        (page: Page) => page.id === arr[movedIndex - 1]?.item
      )!;
      rank = getPageRank(prevPage).genNext().toString();
    } else {
      const prevPage = pages.find(
        (page: Page) => page.id === arr[movedIndex - 1]?.item
      )!;
      const nextPage = pages.find(
        (page: Page) => page.id === arr[movedIndex + 1]?.item
      )!;

      rank = getPageRank(prevPage).between(getPageRank(nextPage)).toString();
    }

    pageStore.updateUserPage({
      pageId: movedPage.id,
      updates: { rank },
    });

    draggedPageId.value = null;
  });

  window.addEventListener("pointerup", () => {
    draggedPageId.value = null;
  });
});

onUnmounted(() => {
  swapy.value?.destroy();
});

const slotItemMap = ref<SlotItemMapArray>([
  ...utils.initSlotItemMap(pages, "id"),
]);

watch(
  () => pages,
  () => {
    utils.dynamicSwapy(
      swapy.value,
      pages,
      "id",
      slotItemMap.value,
      (value: SlotItemMapArray) => (slotItemMap.value = value)
    );
  },
  { deep: true }
);

// if adding a new page, use the order assigned in pages prop
watch(
  () => pages.length,
  () => {
    slotItemMap.value = utils.initSlotItemMap(pages, "id");
  }
);

function getPageRank(page: Page): LexoRank {
  const userPage = pageStore.userPages.find((up) => up.pageId === page.id);
  if (!userPage) throw new Error("UserPage not found for Page");

  return LexoRank.parse(userPage.rank);
}

const slottedItems = computed(() =>
  utils.toSlottedItems(pages, "id", slotItemMap.value)
);
</script>
