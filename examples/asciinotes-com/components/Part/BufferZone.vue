<template>
  <div
    class="bufferZone"
    :style="{
      backgroundImage: `linear-gradient(
        45deg,
        ${secondaryColor} 25%,
        ${backgroundColor} 25%,
        ${backgroundColor} 50%,
        ${secondaryColor} 50%,
        ${secondaryColor} 75%,
        ${backgroundColor} 75%,
        ${backgroundColor}
      )`,
    }"
  ></div>
</template>

<script setup lang="ts">
import tinycolor from 'tinycolor2';

const siteStore = useSiteStore();

const backgroundColor = computed(() => siteStore.currentPage?.backgroundColor || '#ffffff');

const secondaryColor = computed(() => {
  const color = tinycolor(backgroundColor.value);

  if (color.isLight()) {
    color.darken(15);
  } else {
    color.lighten(15);
  }

  return color.toHexString();
});
</script>

<style scoped>
.bufferZone {
  width: 100%;
  height: 100%;
  border: calc(4px / var(--parts-zoom)) solid black;

  background-size: calc(50px / var(--parts-zoom)) calc(50px / var(--parts-zoom));
}
</style>
