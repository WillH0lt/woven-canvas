<template>
  <div ref="containerRef">
    <div class="w-full flex items-center px-4 py-2 border-t border-gray-400">
      <div class="font-bold">Scrolly Animations</div>
      <ElementDropdown class="ml-auto pl-2" :menuItems="effectMenuItems" size="small">
        <SvgoPlus />
      </ElementDropdown>
    </div>

    <div
      class="w-full px-4 py-2"
      v-for="{ slotId, itemId, item: effect } in slottedItems"
      :key="slotId"
      :data-swapy-slot="slotId"
    >
      <SideMenuEffect
        :effect="effect!"
        :expanded="expandedEffectId === effect!.id"
        :key="itemId"
        :data-swapy-item="itemId"
        @click="toggleEffectExpanded(effect!.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { LexoRank } from 'lexorank';
import { createSwapy, utils } from 'swapy';
import type { Swapy, SlotItemMapArray } from 'swapy';
import { v4 as uuid } from 'uuid';
import { EffectDirection, EffectKind, TriggerReason } from '@prisma/client';

import { SideMenuKind } from '~/types/index.js';

const studioStore = useStudioStore();
const siteStore = useSiteStore();

const swapy = ref<Swapy | null>(null);
const containerRef = useTemplateRef('containerRef');
const draggedEffectId = ref<string | null>(null);

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
    draggedEffectId.value = event.draggingItem;
  });

  swapy.value.onSwapEnd((event) => {
    if (!event.hasChanged || draggedEffectId.value === null) return;

    const arr = event.slotItemMap.asArray;
    if (sortedEffects.value.length <= 1) return;

    const movedEffect = effects.value.find((effect) => effect.id === draggedEffectId.value);
    if (!movedEffect) return;

    const movedIndex = arr.findIndex((item) => item.item === draggedEffectId.value);
    let rank = '';

    if (movedIndex === 0) {
      const nextEffect = effects.value.find((effect) => effect.id === arr[1].item)!;
      rank = LexoRank.parse(nextEffect.rank).genPrev().toString();
    } else if (movedIndex === sortedEffects.value.length - 1) {
      const prevEffect = effects.value.find((effect) => effect.id === arr[movedIndex - 1].item)!;
      rank = LexoRank.parse(prevEffect.rank).genNext().toString();
    } else {
      const prevEffect = effects.value.find((effect) => effect.id === arr[movedIndex - 1].item)!;
      const nextEffect = effects.value.find((effect) => effect.id === arr[movedIndex + 1].item)!;

      rank = LexoRank.parse(prevEffect.rank).between(LexoRank.parse(nextEffect.rank)).toString();
    }

    studioStore.updateEffect({
      ...movedEffect,
      rank,
    });
  });
});

onUnmounted(() => {
  swapy.value?.destroy();
});

const partId = computed(() => {
  if (studioStore.selectedParts.length === 1) {
    return studioStore.selectedParts[0];
  } else {
    return null;
  }
});

const groupId = computed(() => studioStore.selectedGroup);

watchEffect(() => {
  if (
    partId.value === null &&
    groupId.value === null &&
    studioStore.sideMenuKind === SideMenuKind.Effects
  ) {
    studioStore.sideMenuKind = SideMenuKind.None;
  }
});

const effects = computed(() => {
  if (groupId.value !== null) {
    return studioStore.effects.filter((effect) => effect.groupId === groupId.value);
  }

  return studioStore.effects.filter((effect) => effect.partId === partId.value);
});

const sortedEffects = computed(() => {
  return effects.value.sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank)));
});

const slotItemMap = ref<SlotItemMapArray>([...utils.initSlotItemMap(sortedEffects.value, 'id')]);
watch(
  sortedEffects,
  () =>
    utils.dynamicSwapy(
      swapy.value,
      sortedEffects.value,
      'id',
      slotItemMap.value,
      (value: SlotItemMapArray) => (slotItemMap.value = value),
    ),
  { deep: true },
);
const slottedItems = computed(() =>
  utils.toSlottedItems(sortedEffects.value, 'id', slotItemMap.value),
);

const effectMenuItems = computed(() => {
  const partEffects = [
    EffectKind.StickToPage,
    EffectKind.FadeIn,
    EffectKind.FadeOut,
    EffectKind.SlideIn,
    EffectKind.SlideOut,
    EffectKind.ZoomIn,
    EffectKind.ZoomOut,
    EffectKind.RotateIn,
    EffectKind.RotateOut,
  ];

  const groupEffects = [
    EffectKind.StickToPage,
    EffectKind.FadeIn,
    EffectKind.FadeOut,
    EffectKind.SlideIn,
    EffectKind.SlideOut,
  ];

  const effects = studioStore.selectedGroup ? groupEffects : partEffects;

  return effects.map((kind) => {
    const text = kind
      .toString()
      .replace(/([A-Z])/g, ' $1')
      .trim();

    return {
      text,
      onClick: () => addEffect(kind),
    };
  });
});

function addEffect(kind: EffectKind) {
  if (!siteStore.currentPage) return;

  let maxRank = LexoRank.middle();
  if (sortedEffects.value.length > 0) {
    const maxRankStr = sortedEffects.value[sortedEffects.value.length - 1].rank;
    maxRank = LexoRank.parse(maxRankStr);
  }
  const nextRank = maxRank.genNext();

  const distancePx = 500;

  let startWhen: TriggerReason = TriggerReason.ScreenMiddle;
  let deltaParallel = 0;
  let deltaPerpendicular = 0;
  let deltaRotateZ = 0;
  let scalarOpacity = 100;
  let scalarScale = 100;

  if (kind === EffectKind.StickToPage) {
    deltaParallel = distancePx;
  } else if (kind === EffectKind.FadeOut || kind === EffectKind.FadeIn) {
    scalarOpacity = 0;
  } else if (kind === EffectKind.SlideOut || kind === EffectKind.SlideIn) {
    deltaPerpendicular = distancePx;
  } else if (kind === EffectKind.ZoomOut || kind === EffectKind.ZoomIn) {
    scalarScale = 200;
  } else if (kind === EffectKind.RotateOut || kind === EffectKind.RotateIn) {
    deltaRotateZ = 180;
  }

  if (kind.toString().endsWith('In')) {
    startWhen = TriggerReason.BeforeEnter;
  }

  let direction: EffectDirection = EffectDirection.Forwards;
  if (
    kind === EffectKind.FadeIn ||
    kind === EffectKind.SlideIn ||
    kind === EffectKind.ZoomIn ||
    kind === EffectKind.RotateIn
  ) {
    direction = EffectDirection.Backwards;
  }

  const effectId = uuid();

  studioStore.addEffect({
    id: effectId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: '',
    partId: partId.value,
    groupId: groupId.value,
    pageId: siteStore.currentPage.id,
    kind,
    startWhen,
    direction,
    distancePx,
    deltaParallel,
    deltaPerpendicular,
    deltaRotateZ,
    scalarOpacity,
    scalarScale,
    rank: nextRank.toString(),
  });

  expandedEffectId.value = effectId;
}

const expandedEffectId = ref<string | null>(null);
function toggleEffectExpanded(effectId: string) {
  if (expandedEffectId.value === effectId) {
    expandedEffectId.value = null;
  } else {
    expandedEffectId.value = effectId;
  }
}

watch(expandedEffectId, () => {
  swapy.value?.enable(expandedEffectId.value === null);
});
</script>
