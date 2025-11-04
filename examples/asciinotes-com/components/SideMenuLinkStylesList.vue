<template>
  <div ref="containerRef">
    <div class="w-full flex items-center px-4 py-2 border-t border-gray-400">
      <div class="font-bold">Link Styles</div>
      <SvgoPlus
        class="ml-auto w-4 h-4 cursor-pointer hover:scale-105 transition-transform"
        @click="studioStore.addLinkStyle(siteStore.currentPage!.id)"
      />
    </div>

    <div
      class="w-full px-4 py-2"
      v-for="{ slotId, itemId, item: linkStyle } in slottedItems"
      :key="slotId"
      :data-swapy-slot="slotId"
    >
      <SideMenuLinkStyle
        v-if="linkStyle"
        :linkStyle="linkStyle"
        :expanded="studioStore.expandedLinkStyleId === linkStyle.id"
        :key="itemId"
        :data-swapy-item="itemId"
        @click="toggleLinkStyleExpanded(linkStyle.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { LexoRank } from 'lexorank';
import { createSwapy, utils } from 'swapy';
import type { Swapy, SlotItemMapArray } from 'swapy';

const studioStore = useStudioStore();
const siteStore = useSiteStore();

const swapy = ref<Swapy | null>(null);
const containerRef = useTemplateRef('containerRef');
const draggedLinkStyleId = ref<string | null>(null);

const linkStyles = computed(() => studioStore.sortedLinkStyles);

onMounted(() => {
  swapy.value = createSwapy(containerRef.value!, {
    manualSwap: true,
    dragAxis: 'y',
    autoScrollOnDrag: true,
  });
  swapy.value.onSwap((event) => {
    requestAnimationFrame(() => {
      slotItemMap.value = event.newSlotItemMap.asArray;
    });
  });

  swapy.value.onSwapStart((event) => {
    draggedLinkStyleId.value = event.draggingItem;
  });

  swapy.value.onSwapEnd((event) => {
    if (!event.hasChanged || draggedLinkStyleId.value === null) return;

    const arr = event.slotItemMap.asArray;
    if (linkStyles.value.length <= 1) return;

    const movedLinkStyle = linkStyles.value.find(
      (linkStyle) => linkStyle.id === draggedLinkStyleId.value,
    );
    if (!movedLinkStyle) return;

    const movedIndex = arr.findIndex((item) => item.item === draggedLinkStyleId.value);
    let rank = '';

    if (movedIndex === 0) {
      const nextLinkStyle = linkStyles.value.find((linkStyle) => linkStyle.id === arr[1].item)!;
      rank = LexoRank.parse(nextLinkStyle.rank).genPrev().toString();
    } else if (movedIndex === linkStyles.value.length - 1) {
      const prevLinkStye = linkStyles.value.find(
        (linkStyle) => linkStyle.id === arr[movedIndex - 1].item,
      )!;
      rank = LexoRank.parse(prevLinkStye.rank).genNext().toString();
    } else {
      const prevLinkStyle = linkStyles.value.find(
        (linkStyle) => linkStyle.id === arr[movedIndex - 1].item,
      )!;
      const nextLinkStyle = linkStyles.value.find(
        (linkStyle) => linkStyle.id === arr[movedIndex + 1].item,
      )!;

      rank = LexoRank.parse(prevLinkStyle.rank)
        .between(LexoRank.parse(nextLinkStyle.rank))
        .toString();
    }

    studioStore.updateLinkStyle({
      ...movedLinkStyle,
      rank,
    });
  });

  swapy.value?.enable(studioStore.expandedLinkStyleId === null);
});

onUnmounted(() => {
  swapy.value?.destroy();
});

const slotItemMap = ref<SlotItemMapArray>([...utils.initSlotItemMap(linkStyles.value, 'id')]);
const slottedItems = computed(() =>
  utils.toSlottedItems(linkStyles.value, 'id', slotItemMap.value),
);
watch(
  linkStyles,
  () =>
    utils.dynamicSwapy(
      swapy.value,
      linkStyles.value,
      'id',
      slotItemMap.value,
      (value: SlotItemMapArray) => (slotItemMap.value = value),
    ),
  { deep: true },
);

function toggleLinkStyleExpanded(linkStyleId: string) {
  if (studioStore.expandedLinkStyleId === linkStyleId) {
    studioStore.expandedLinkStyleId = null;
  } else {
    studioStore.expandedLinkStyleId = linkStyleId;
  }
}

watch(
  () => studioStore.expandedLinkStyleId,
  () => {
    swapy.value?.enable(studioStore.expandedLinkStyleId === null);
  },
  {
    immediate: true,
  },
);
</script>
