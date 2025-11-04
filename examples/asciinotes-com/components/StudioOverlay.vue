<template>
  <div
    @mouseenter="handleMouseOver"
    @mouseleave="handleMouseLeave"
    @click.stop
    @dblclick.stop
    @pointerdown.stop
  >
    <!-- @pointerup.stop -->
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
const studioStore = useStudioStore();

function handleMouseOver() {
  document.dispatchEvent(new Event('mouse-studio-leave'));
}

function handleMouseLeave() {
  document.dispatchEvent(new Event('mouse-studio-enter'));
}

onBeforeUnmount(() => {
  handleMouseLeave();
});

onBeforeRouteUpdate((to) => {
  if (to.name === 'studio-pageId') {
    handleMouseLeave();
  } else {
    studioStore.deselectAll();
    handleMouseOver();
  }
});
</script>
