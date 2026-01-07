<template>
  <div class="ic-transform-handle" />
</template>

<style>
.ic-transform-handle {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px solid var(--ic-primary);
  border-radius: 2px;
  background-color: var(--ic-gray-100);
  pointer-events: none;
  transition-property: background-color;
  transition-timing-function: var(--ic-transition-timing-function);
  transition-duration: var(--ic-transition-duration);
}

.ic-transform-handle:hover {
  background-color: var(--ic-primary);
}
</style>
