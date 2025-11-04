<template>
  <div>
    <SvgoCrayon
      class="w-full px-4 translate-y-16 hover:scale-105 transition-transform cursor-pointer"
      :class="{
        'dark-wax': luminance(color) < 50,
        'bright-wax': luminance(color) > 175,
      }"
      :style="{
        fill: color,
        'pointer-events': paletteVisible ? 'none' : 'auto',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { luminance } from '../utils.js';

const color = ref('#eb4034');
const paletteVisible = ref(false);
</script>
