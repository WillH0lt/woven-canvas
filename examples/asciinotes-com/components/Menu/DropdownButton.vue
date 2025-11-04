<template>
  <div
    class="group flex items-center justify-center px-3 h-full hover:bg-gray-600 transition-colors text-xs"
  >
    <div
      class="max-w-20 flex items-center justify-center px-1.5 py-1 rounded-md border border-transparent group-hover:border-gray-200 cursor-default"
    >
      <div class="text-nowrap overflow-hidden overflow-ellipsis mr-2">{{ label }}</div>
      <SvgoChevronDown class="w-2 ml-auto mb-0.5 text-gray-300" />
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>
