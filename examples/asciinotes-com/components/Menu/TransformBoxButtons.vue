<template>
  <MenuButton
    v-if="!isGroup"
    class="text-xs w-fit h-full pr-1 pl-2 hover:bg-gray-200"
    @click="studioStore.groupSelectedParts"
  >
    Group
  </MenuButton>
  <MenuButton
    v-if="isGroup"
    class="text-xs w-fit h-full pr-1 pl-2 hover:bg-gray-200"
    @click="studioStore.ungroupSelectedParts"
  >
    Ungroup
  </MenuButton>
</template>

<script setup lang="ts">
const studioStore = useStudioStore();

const isGroup = computed(() => {
  return studioStore.selectedGroup !== null;
});
</script>
