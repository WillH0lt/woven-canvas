<template>
  <div class="ic-arrow-handle">
    <div class="ic-arrow-handle-inner"></div>
  </div>
</template>

<style>
.ic-arrow-handle {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.ic-arrow-handle-inner {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}

/*
  Sub-pixel shrinking border: draw at zoom scale then inverse-scale.
  Pre-scale: size * var(--ic-zoom) with a 2px border & 2px radius.
  After transform scale(1/zoom): apparent border width & radius become 2px / zoom.
*/
.ic-arrow-handle-inner::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(100% * var(--ic-zoom));
  height: calc(100% * var(--ic-zoom));
  border-radius: 50%;
  box-sizing: border-box;
  background-color: var(--ic-primary-light);
  transform: translate(-50%, -50%) scale(calc(1 / var(--ic-zoom)));
  transform-origin: center center;
  transition-property: background-color;
  transition-timing-function: var(--ic-transition-timing-function);
  transition-duration: var(--ic-transition-duration);
  opacity: 0;
}

.ic-arrow-handle-inner::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(50% * var(--ic-zoom));
  height: calc(50% * var(--ic-zoom));
  border-radius: 50%;
  box-sizing: border-box;
  border: 2px solid var(--ic-primary);
  background-color: var(--ic-gray-100);
  transform: translate(-50%, -50%) scale(calc(1 / var(--ic-zoom)));
  transform-origin: center center;
  transition-property: background-color;
  transition-timing-function: var(--ic-transition-timing-function);
  transition-duration: var(--ic-transition-duration);
}

.ic-block[data-hovered] > .ic-arrow-handle {
  outline: none;
}

.ic-block[data-hovered] > .ic-arrow-handle > .ic-arrow-handle-inner::before {
  opacity: 0.4;
}


</style>
