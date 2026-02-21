<template>
  <div class="wov-arrow-terminal">
    <div class="wov-arrow-terminal-ring">
      <div class="wov-arrow-terminal-fill"></div>
    </div>
  </div>
</template>

<style>
.wov-arrow-terminal {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.wov-arrow-terminal-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-sizing: border-box;
  border: calc(3px / var(--wov-zoom)) solid var(--wov-primary);
  transform: translate(-50%, -50%);
  transform-origin: center center;
}

.wov-arrow-terminal-fill {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: var(--wov-gray-100);
  opacity: 0.8;
}
</style>
