<template>
  <sl-dropdown
    ref="dropdownRef"
    class="ml-auto"
    placement="bottom-end"
    @sl-show="emit('show')"
    @sl-hide="emit('hide')"
    hoist
  >
    <div
      class="flex items-center justify-center aspect-square hover:bg-gray-200 cursor-pointer transition-colors [&>*]:h-full"
      :class="{
        'w-6 p-1 rounded': size === 'small',
        'w-8 p-1.5 rounded': size === 'medium',
        'w-10 p-2.5 rounded-full': size === 'large',
      }"
      slot="trigger"
    >
      <slot></slot>
      <!-- <SvgoEllipsisVertical class="h-full text-gray-500" /> -->
    </div>
    <!-- <div class="fixed inset-0 bg-primary" v-if="visible" @click="hide"></div> -->
    <sl-menu v-on-click-outside="() => handleClickOutside()">
      <sl-menu-item
        v-for="menuItem in menuItems"
        @click="menuItem.onClick"
        :loading="menuItem.loading"
      >
        {{ menuItem.text }}
      </sl-menu-item>
    </sl-menu>
  </sl-dropdown>
</template>

<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import type { MenuItem } from '~/types/index.js';
import SlDropdown from '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';

interface Props {
  menuItems: MenuItem[];
  size?: 'small' | 'medium' | 'large';
}

withDefaults(defineProps<Props>(), {
  size: 'large',
});

const emit = defineEmits(['show', 'hide']);

const dropdownRef = useTemplateRef<SlDropdown>('dropdownRef');

function handleClickOutside() {
  if (dropdownRef.value?.open) {
    dropdownRef.value.hide();
  }
}
</script>

<style scoped>
sl-menu {
  background-color: var(--color-gray-200);
}

sl-dropdown:not(:defined) {
  display: none;
}

sl-menu-item::part(base) {
  color: var(--color-gray-700);
}

sl-menu-item:hover::part(base),
sl-menu-item:focus-visible::part(base) {
  background-color: var(--color-gray-300);
  color: var(--color-gray-700);
}

::part(panel) {
  z-index: 100;
}
</style>
