<template>
  <div class="ic-arrow-terminal">
    <div class="ic-arrow-terminal-ring">
      <div class="ic-arrow-terminal-fill"></div>
    </div>
  </div>
</template>

<style>
.ic-arrow-terminal {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ic-arrow-terminal-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-sizing: border-box;
  border: calc(3px / var(--ic-zoom)) solid var(--ic-primary);
  transform: translate(-50%, -50%);
  transform-origin: center center;
}

.ic-arrow-terminal-fill {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: var(--ic-gray-100);
  opacity: 0.8;
}
</style>
