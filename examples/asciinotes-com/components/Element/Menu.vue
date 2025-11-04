<template>
  <slot :onClick="() => (visible = !visible)"></slot>
  <div
    class="px-2 shadow-lg text-black focus:outline-none focus:outline-2 focus:outline-primary"
    v-if="visible"
  >
    <div
      class="absolute top-0 max-h-80 overflow-auto bg-secondary text-white shadow-lg z-50"
      :style="{
        right: '100%',
      }"
      v-on-click-outside="() => (visible = false)"
    >
      <div
        class="relative text-xl p-2 cursor-pointer transition-colors text-center whitespace-nowrap hover:bg-primary"
        v-for="item of items"
        @click="handleClick(item)"
      >
        <div
          :class="{
            'opacity-30': loadingItems[item.text],
          }"
        >
          {{ item.text }}
        </div>
        <ElementLoadingIcon
          v-if="loadingItems[item.text]"
          class="absolute inset-1/2 scale-[40%]"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { vOnClickOutside } from "@vueuse/components";

import { MenuItem } from "~/types";

const props = defineProps<{
  items: MenuItem[];
}>();

const loadingItems = ref<Record<string, boolean>>({});

// interface ExtendedMenuItem extends MenuItem {
//   loading?: boolean;
// }

// const extendedItems = ref(
//   props.items.map((item) => ({
//     ...item,
//     loading: false,
//   }))
// );

// watch(
//   () => props.items,
//   (items) => {
//     extendedItems.value = items.map((item) => ({
//       ...item,
//       loading: false,
//     }));
//   }
// );

const visible = ref(false);

async function handleClick(item: MenuItem) {
  loadingItems.value[item.text] = true;
  try {
    await item.onClick();
  } catch (error) {
    console.error("Failed handleClick", error);
  }
  loadingItems.value[item.text] = false;
  visible.value = false;
}
</script>
