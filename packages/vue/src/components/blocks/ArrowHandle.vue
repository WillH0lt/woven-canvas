<template>
  <div class="wov-arrow-handle">
    <div class="wov-arrow-handle-inner"></div>
  </div>
</template>

<style>
.wov-arrow-handle {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.wov-arrow-handle-inner {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}

/*
  Sub-pixel shrinking border: draw at zoom scale then inverse-scale.
  Pre-scale: size * var(--wov-zoom) with a 2px border & 2px radius.
  After transform scale(1/zoom): apparent border width & radius become 2px / zoom.
*/
.wov-arrow-handle-inner::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  box-sizing: border-box;
  background-color: var(--wov-primary-light);
  transform: translate(-50%, -50%) scale(calc(1 / var(--wov-zoom)));
  transform-origin: center center;
  transition-property: background-color;
  transition-timing-function: var(--wov-transition-timing-function);
  transition-duration: var(--wov-transition-duration);
  opacity: 0;
}

.wov-arrow-handle-inner::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 50%;
  height: 50%;
  border-radius: 50%;
  box-sizing: border-box;
  border: calc(2px / var(--wov-zoom)) solid var(--wov-primary);
  background-color: var(--wov-gray-100);
  transform: translate(-50%, -50%);
  transform-origin: center center;
  transition-property: background-color;
  transition-timing-function: var(--wov-transition-timing-function);
  transition-duration: var(--wov-transition-duration);
}

.wov-block[data-hovered] > .wov-arrow-handle {
  outline: none;
}

.wov-block[data-hovered] > .wov-arrow-handle > .wov-arrow-handle-inner::before {
  opacity: 0.4;
}
</style>
