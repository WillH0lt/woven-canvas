<template>
  <div
    class="bg-gray-700 drop-shadow-md rounded-xl cursor-default"
    @wheel.stop
    v-on-click-outside="() => $emit('blur')"
  >
    <div
      class="h-52 text-white overflow-y-scroll [&>*:first-child]:rounded-tl-xl [&>*:last-child]:rounded-bl-xl"
    >
      <div
        class="flex items-center h-10 px-2 w-full transition-colors"
        :class="{
          'bg-primary': fontFamily === family,
          'hover:bg-gray-600': fontFamily !== family,
        }"
        v-for="family in fontFamilies"
        @click="selectFont(family)"
      >
        <img
          class="invert h-full py-3 overflow-hidden object-cover object-left"
          :src="`https://storage.googleapis.com/scrolly-page-fonts/${family.replace(/ /g, '')}.png`"
          :alt="family"
        />
      </div>
    </div>

    <div class="my-1 w-full h-[0.75px] bg-gray-600"></div>
    <div class="flex relative items-center justify-center w-full text-white">
      <SvgoMagnifyingGlass class="absolute left-4 w-4 text-gray-300" />
      <input
        class="bg-gray-700 w-full pl-8 m-2 rounded-md border-none focus:outline-none"
        v-model="searchText"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';

import allFontFamilies from '~/fontFamilies.json';

defineEmits<{
  (e: 'blur'): void;
}>();

const fontFamily = defineModel<string>({ required: true });
const fontStore = useFontStore();

async function selectFont(family: string): Promise<void> {
  await fontStore.loadFont(family);
  fontFamily.value = family;
}

const searchText = ref('');
const fontFamilies = computed(() => {
  if (searchText.value === '') {
    return allFontFamilies;
  }

  return allFontFamilies.filter((family) =>
    family.toLowerCase().includes(searchText.value.toLowerCase()),
  );
});

// function loadFontFamily(family: string): void {
//   const href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}&display=block`;
//   const link = document.createElement('link');
//   link.rel = 'stylesheet';
//   link.href = href;
//   link.onload = () => {
//     fontFamily.value = family;
//   };
//   document.head.appendChild(link);
// }
</script>
