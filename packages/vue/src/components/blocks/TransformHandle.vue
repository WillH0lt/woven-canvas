<template>
  <div class="wov-transform-handle" />
</template>

<style>
.wov-transform-handle {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: calc(2px / var(--wov-zoom)) solid var(--wov-primary);
  border-radius: calc(2px / var(--wov-zoom));
  background-color: var(--wov-gray-100);
  transition-property: background-color;
  transition-timing-function: var(--wov-transition-timing-function);
  transition-duration: var(--wov-transition-duration);
}

.wov-block[data-hovered] > .wov-transform-handle {
  background-color: var(--wov-primary);
}
</style>
