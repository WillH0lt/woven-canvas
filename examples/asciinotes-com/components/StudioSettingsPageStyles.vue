<template>
  <StudioSettings @close="$emit('close')" side="right">
    <div class="w-full px-8 py-2 flex flex-col gap-2">
      <div class="flex items-center">
        <div class="mr-auto">Scroll Direction</div>
        <div
          v-for="direction in scrollDirections"
          :key="direction.value"
          class="flex items-center p-2 cursor-pointer rounded-lg"
          :class="{
            'bg-primary text-gray-200': siteStore.currentPage?.scrollDirection === direction.value,
          }"
          @click="() => updateScrollDirection(direction.value)"
        >
          <component :is="direction.icon" class="w-6 aspect-square" />
        </div>
      </div>

      <div class="flex items-center">
        <div class="mr-auto">Background</div>
        <ElementColorPicker
          v-if="siteStore.currentPage"
          v-model="siteStore.currentPage.backgroundColor"
          @blur="save"
        />
      </div>

      <!-- <div class="flex items-center">
        <div class="mr-auto">Use Max Width</div>
        <ElementToggle v-if="siteStore.currentPage" v-model="useMaxWidth" @blur="save" /> -->
      <!-- <div class="mr-auto">Minimum Width</div> -->
      <!-- <ElementInputAndSlider
          v-if="siteStore.currentPage"
          v-model="siteStore.currentPage.minWidth"
          label="Phone Cutoff"
          :sliderMin="375"
          :sliderMax="1920"
          :min="0"
          :max="1e6"
          background="white"
          @blur="save"
          suffix="px"
        /> -->
      <!-- @update="save" -->
      <!-- </div> -->
    </div>
  </StudioSettings>
</template>

<script setup lang="ts">
import { ScrollDirection } from '@prisma/client';

defineEmits(['close']);

const siteStore = useSiteStore();
const studioStore = useStudioStore();

const useMaxWidth = ref(false);

// const color = ref('#ffffff');

const scrollDirections = ref([
  {
    name: 'Vertical',
    value: ScrollDirection.Vertical,
    icon: 'SvgoUpDown',
  },
  {
    name: 'Horizontal',
    value: ScrollDirection.Horizontal,
    icon: 'SvgoLeftRight',
  },
]);

async function updateScrollDirection(direction: ScrollDirection) {
  if (!siteStore.currentPage) return;
  await siteStore.updatePage(siteStore.currentPage.id, { scrollDirection: direction });
  studioStore.centerViewport(true);
}

async function save() {
  if (!siteStore.currentPage) return;
  await siteStore.updatePage(siteStore.currentPage.id, {
    backgroundColor: siteStore.currentPage.backgroundColor,
  });
}

// watchEffect(() => {
//   color.value = studioStore.currentPage?.backgroundColor || '#ffffff';
// });

// watch(color, (value) => {
//   if (!studioStore.currentPage) return;
//   studioStore.currentPage.backgroundColor = value;
// });
</script>
