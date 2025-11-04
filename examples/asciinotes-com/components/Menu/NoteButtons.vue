<template>
  <MenuColorButton
    ref="colorButtonRef"
    :color="color"
    data-tooltip="Color"
    @click="colorMenuVisible = !colorMenuVisible"
  />

  <div ref="colorMenuRef" :style="colorMenuStyles">
    <MenuColor
      class="w-32"
      v-if="colorMenuVisible"
      v-model="color"
      @blur="updateColor(color)"
      :palette="PALETTE"
    />
  </div>
</template>

<script setup lang="ts">
const studioStore = useStudioStore();

const PALETTE = ['#cdfc93', '#ff7ecd', '#71d7ff', '#ce81ff', '#fee09b'];

const color = ref(studioStore.selectedPart?.backgroundColor ?? '#ffffff');
watch(color, (v) => {
  if (studioStore.selectedPart) {
    studioStore.selectedPart.backgroundColor = v;
  }
});

const colorMenuVisible = ref(false);
const colorButtonRef = ref<HTMLElement | null>(null);
const colorMenuRef = ref<HTMLElement | null>(null);
const { floatingStyles: colorMenuStyles } = useMenus(colorButtonRef, colorMenuRef, {
  offset: 2,
  placement: 'top',
});

function updateColor(color: string) {
  if (studioStore.selectedPart) {
    studioStore.selectedPart.backgroundColor = color;
    studioStore.updatePartInStudio(studioStore.selectedPart);
  }

  colorMenuVisible.value = false;
}
</script>
