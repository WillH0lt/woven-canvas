<template>
  <div class="flex gap-4 items-center">
    <div
      class="w-10 h-6 cursor-pointer transition-colors rounded-lg"
      :class="{
        'bg-primary': active,
        'bg-gray-400': !active,
      }"
      @pointerdown="handlePointerDown"
    >
      <div
        class="flex items-center justify-center w-4 h-4 m-1 bg-gray-100 transition rounded-md shadow-md text-gray-500"
        :class="{
          'translate-x-4': active,
        }"
      >
        <SvgoCheck class="h-3" v-if="active" />
        <SvgoX class="h-3" v-else />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const active = defineModel<boolean>({ required: true });

const emit = defineEmits(['update']);

function handlePointerDown() {
  active.value = !active.value;
  emit('update', active.value);
}
</script>
