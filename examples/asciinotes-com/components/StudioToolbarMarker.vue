<template>
  <div>
    <SvgoMarker
      class="w-full px-3 translate-y-11 hover:scale-105 transition-transform cursor-pointer"
      :class="{
        'dark-wax': luminance(color) < 50,
        'bright-wax': luminance(color) > 175,
      }"
      :style="{
        color: '#6a58f2',
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
