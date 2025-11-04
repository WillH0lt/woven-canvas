<template>
  <div
    class="flex items-center justify-center px-3 h-full transition-colors cursor-default"
    :class="{
      'bg-primary': active,
      'hover:bg-gray-600': !active,
    }"
  >
    <!-- <div class="w-4"> -->
    <slot />
    <!-- </div> -->
  </div>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean;
}>();
</script>
