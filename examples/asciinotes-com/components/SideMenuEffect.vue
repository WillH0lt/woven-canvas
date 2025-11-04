<template>
  <div class="flex flex-col bg-white rounded-lg p-2 text-black font-bold drop-shadow text-gray-600">
    <div class="flex items-center px-2 gap-3">
      <SvgoChevronRight
        class="h-4 cursor-pointer hover:scale-110 transition-transform"
        :class="{
          'rotate-90': expanded,
        }"
      />
      <div class="select-none">{{ effectName }}</div>
      <SvgoTrash
        v-if="expanded"
        class="ml-auto h-4 cursor-pointer text-gray-500 hover:scale-110 transition-transform"
        @click="studioStore.removeEffect(effect!)"
      />
      <SvgoHandle
        v-else
        class="ml-auto h-4 cursor-grab text-gray-400 hover:scale-110 transition-transform"
      />
    </div>
    <div class="flex flex-col gap-4 pt-8 pb-3 px-7 font-normal" v-if="expanded" @click.stop>
      <div class="flex items-center justify-center">
        <div>Start</div>
        <ElementSelection
          class="ml-auto pl-2 w-48"
          :selectionItems="getStartAtSelectionItems()"
          v-model="effect.startWhen"
          @select="studioStore.updateEffect(effect)"
        />
      </div>
      <ElementInputAndSlider
        label="Scroll"
        v-model="distancePx"
        @blur="handleBlur"
        @update="handleUpdate"
        :sliderMin="0"
        :sliderMax="1500"
        :min="-1e6"
        :max="1e6"
        suffix="px"
      />
      <ElementInputAndSlider
        v-if="effect.kind === EffectKind.FadeOut || effect.kind === EffectKind.FadeIn"
        label="Opacity"
        v-model="scalarOpacity"
        @blur="handleBlur"
        @update="handleUpdate"
        :sliderMin="0"
        :sliderMax="100"
        :min="0"
        :max="100"
        :step="1"
        suffix="%"
      />
      <ElementInputAndSlider
        v-if="effect.kind === EffectKind.SlideOut || effect.kind === EffectKind.SlideIn"
        :label="`Slide ${perpendicularAxisName}`"
        v-model="deltaPerpendicular"
        @blur="handleBlur"
        @update="handleUpdate"
        :sliderMin="-1000"
        :sliderMax="1000"
        :min="-10000"
        :max="10000"
        :step="1"
        suffix="px"
      />

      <ElementInputAndSlider
        v-if="effect.kind === EffectKind.SlideOut || effect.kind === EffectKind.SlideIn"
        :label="`Slide ${parallelAxisName}`"
        v-model="deltaParallel"
        @blur="handleBlur"
        @update="handleUpdate"
        :sliderMin="-1000"
        :sliderMax="1000"
        :min="-10000"
        :max="10000"
        :step="1"
        suffix="px"
      />

      <ElementInputAndSlider
        v-if="effect.kind === EffectKind.ZoomOut || effect.kind === EffectKind.ZoomIn"
        label="Zoom"
        v-model="scalarScale"
        @blur="handleBlur"
        @update="handleUpdate"
        :sliderMin="0"
        :sliderMax="500"
        :min="0"
        :max="10000"
        :step="1"
        suffix="%"
      />

      <ElementInputAndSlider
        v-if="effect.kind === EffectKind.RotateOut || effect.kind === EffectKind.RotateIn"
        label="Rotation"
        v-model="deltaRotateZ"
        @blur="handleBlur"
        @update="handleUpdate"
        :sliderMin="-360"
        :sliderMax="360"
        :min="-3600"
        :max="3600"
        :step="1"
        suffix="°"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { EffectKind, ScrollDirection, TriggerReason } from '@prisma/client';
import type { Effect } from '@prisma/client';

import type { SelectionItem } from '~/types/index.js';

const props = defineProps<{
  effect: Effect;
  expanded: boolean;
}>();

const siteStore = useSiteStore();
const studioStore = useStudioStore();

const distancePx = ref(0);
const scalarOpacity = ref(0);
const deltaPerpendicular = ref(0);
const deltaParallel = ref(0);
const scalarScale = ref(0);
const deltaRotateZ = ref(0);

watchEffect(() => {
  distancePx.value = props.effect.distancePx;
  scalarOpacity.value = props.effect.scalarOpacity;
  deltaPerpendicular.value = props.effect.deltaPerpendicular;
  deltaParallel.value = props.effect.deltaParallel;
  scalarScale.value = props.effect.scalarScale;
  deltaRotateZ.value = props.effect.deltaRotateZ;
});

function handleBlur(): void {
  studioStore.createSnapshot();
}

function handleUpdate(): void {
  props.effect.distancePx = distancePx.value;
  if (props.effect.kind === EffectKind.StickToPage) {
    props.effect.deltaParallel = props.effect.distancePx;
  } else {
    props.effect.deltaParallel = deltaParallel.value;
  }

  props.effect.scalarOpacity = scalarOpacity.value;
  props.effect.deltaPerpendicular = deltaPerpendicular.value;
  props.effect.scalarScale = scalarScale.value;
  props.effect.deltaRotateZ = deltaRotateZ.value;

  studioStore.updateEffectNoSnapshot(props.effect);
}

const effectName = computed(() => {
  const name = props.effect.kind
    .toString()
    .replace(/([A-Z])/g, ' $1')
    .trim();
  return `${name} (${triggerName.value?.toLowerCase()})`;
});

const parallelAxisName = computed(() => {
  return siteStore.currentPage?.scrollDirection === ScrollDirection.Horizontal ? 'X' : 'Y';
});

const perpendicularAxisName = computed(() => {
  return siteStore.currentPage?.scrollDirection === ScrollDirection.Horizontal ? 'Y' : 'X';
});

const triggerName = computed(() => {
  const trigger = props.effect.startWhen;
  const item = getStartAtSelectionItems().find((i) => i.key === trigger);
  return item?.text;
});

function getStartAtSelectionItems(): SelectionItem[] {
  const items = [
    {
      text: 'Before enter',
      key: TriggerReason.BeforeEnter,
    },
    {
      text:
        siteStore.currentPage?.scrollDirection === ScrollDirection.Horizontal
          ? 'At screen left'
          : 'At screen top',
      key: TriggerReason.ScreenStart,
    },
    {
      text: 'At screen middle',
      key: TriggerReason.ScreenMiddle,
    },
    {
      text:
        siteStore.currentPage?.scrollDirection === ScrollDirection.Horizontal
          ? 'At screen right'
          : 'At screen bottom',
      key: TriggerReason.ScreenEnd,
    },
    {
      text: 'On page load',
      key: TriggerReason.OnPageLoad,
    },
    {
      text: 'With previous',
      key: TriggerReason.WithPrevious,
    },
    {
      text: 'After previous',
      key: TriggerReason.AfterPrevious,
    },
  ];

  return items;
}
</script>
