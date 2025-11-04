<template>
  <button
    class="h-[40px] relative text-gray-300 rounded-lg p-[12px] bg-primary text-white whitespace-nowrap disabled:opacity-50 transition-opacity"
    :class="{
      'cursor-pointer hover:opacity-90': !loading && !disabled,
      'pointer-events-none': showCheck,
    }"
    :disabled="loading || disabled"
  >
    <div
      class="flex justify-center items-center w-full h-full"
      :class="{
        'opacity-30': loading,
      }"
    >
      <SvgoCheck v-if="showCheck" class="absolute w-4" />
      <ElementLoadingIcon v-else-if="loading" class="absolute inset-1/2 scale-[40%]" />
      <slot></slot>
    </div>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  loading?: boolean;
  disabled?: boolean;
  showCheckAfterLoading?: boolean;
}>();

const showCheck = ref(false);
watch(
  () => props.loading,
  () => {
    if (!props.loading && props.showCheckAfterLoading) {
      showCheck.value = true;
      setTimeout(() => {
        showCheck.value = false;
      }, 2000);
    }
  },
);
</script>
