<template>
  <div class="ml-auto" placement="bottom-end" @sl-show="open = true" @sl-hide="open = false">
    <div
      class="flex items-center justify-center cursor-pointer transition-colors bg-gray-200 rounded"
      slot="trigger"
      ref="triggerRef"
      @click="open = !open"
    >
      <div
        class="w-full overflow-hidden flex items-center px-4 py-2 rounded"
        :class="{
          'outline outline-1 outline-primary': open,
        }"
      >
        <div>{{ selectedText }}</div>
        <SvgoChevronDown class="h-4 ml-auto" />
      </div>
    </div>

    <Teleport to="body">
      <StudioOverlay v-if="open">
        <sl-menu
          class="fixed drop-shadow text-lg"
          :style="menuStyles"
          v-on-click-outside="() => (open = false)"
        >
          <sl-menu-item v-for="menuItem in menuItems" @click="handleItemClick(menuItem)">
            {{ menuItem.text }}
          </sl-menu-item>
        </sl-menu>
      </StudioOverlay>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown';
import '@shoelace-style/shoelace/dist/components/menu/menu';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item';
import { vOnClickOutside } from '@vueuse/components';

import type { MenuItem, SelectionItem } from '~/types/index.js';

const emit = defineEmits(['select']);

const triggerRef = useTemplateRef('triggerRef');

const props = defineProps<{
  selectionItems: SelectionItem[];
}>();

const selected = defineModel<string>({ required: true });
const open = ref(false);

watch(selected, () => {
  emit('select', selected.value);
});

const menuStyles = computed(() => {
  return {
    top: `${triggerRef.value?.getBoundingClientRect().bottom}px`,
    left: `${triggerRef.value?.getBoundingClientRect().left}px`,
  };
});

const menuItems = computed(() => {
  return props.selectionItems.map((item) => {
    return {
      text: item.text,
      onClick: () => (selected.value = item.key),
    };
  });
});

const selectedText = computed(() => {
  return props.selectionItems.find((item) => item.key === selected.value)?.text;
});

function handleItemClick(item: MenuItem) {
  item.onClick();
  open.value = false;
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
</style>
