<template>
  <div
    class="w-full h-full border-2 border-primary rounded-sm transition-colors"
    :class="{
      '!bg-primary': hovered,
      '!bg-white': !hovered,
    }"
  ></div>
</template>
<script setup lang="ts">
defineProps({
  hovered: Boolean,
});
</script>
