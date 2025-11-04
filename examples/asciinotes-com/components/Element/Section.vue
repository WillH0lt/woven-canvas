<template>
  <div class="pt-8 text-gray-600">
    <div class="flex items-center mb-4">
      <div class="text-2xl font-bold">{{ title }}</div>
    </div>
    <ElementDivider />
    <div class="flex flex-col w-full gap-8">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>
