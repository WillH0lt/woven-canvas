<template>
  <div
    class="flex items-center justify-center px-3 h-full transition-colors"
    :class="{
      'bg-primary': active,
      'hover:bg-gray-600': !active,
    }"
  >
    <div
      class="w-5 h-5 rounded-full outline outline-1 outline-[#ffffff55]"
      :style="{
        backgroundColor: color,
      }"
    ></div>
    <SvgoChevronDown class="w-2 ml-2 mb-0.5 text-gray-300" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  color: string;
  active?: boolean;
}>();
</script>
