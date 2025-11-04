<template>
  <div class="flex flex-col">
    <div class="text-sm mb-2 font-bold">{{ title }}</div>
    <textarea
      class="flex-1 p-2 rounded bg-gray-200 border-none focus:outline-none placeholder:text-gray-400"
      type="text"
      :placeholder="placeholder"
      v-model="value"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; placeholder?: string }>();

const value = defineModel<string | null>({ required: true });
</script>
