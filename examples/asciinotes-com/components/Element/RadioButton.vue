<template>
  <div class="flex items-center mb-4">
    <input
      class="w-7 h-7 bg-gray-100 checked:bg-primary border-4 border-gray-300 rounded-full"
      :class="{ 'cursor-auto': disabled, 'cursor-pointer': !disabled }"
      type="radio"
      v-model="model"
      :value="value"
      :disabled="disabled"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ value: string; disabled?: boolean }>();
const model = defineModel<string>({ required: true });
</script>
