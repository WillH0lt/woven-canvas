<template>
  <MenuLink
    v-if="linkInputVisible"
    class="absolute"
    v-model:link="linkModel"
    @update:link="setHref"
    @hide="linkInputVisible = false"
  />

  <template v-else>
    <MenuButton data-tooltip="Add Hyperlink" @click="linkInputVisible = true">
      <SvgoLink class="w-4" />
    </MenuButton>
    <MenuColorButton
      ref="colorButtonRef"
      :color="color"
      data-tooltip="Color"
      @click="colorMenuVisible = !colorMenuVisible"
    />
  </template>

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

const linkInputVisible = ref(false);
const linkModel = ref(studioStore.selectedPart?.href ?? '');

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

function setHref(href: string) {
  if (studioStore.selectedPart) {
    studioStore.selectedPart.href = href;
    studioStore.updatePartInStudio(studioStore.selectedPart);
  }
}
</script>
