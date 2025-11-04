<template>
  <div class="">
    <input
      class="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none accent-primary"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      v-model="modelStr"
      @blur="$emit('blur')"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  min: number;
  max: number;
  step?: number;
}>();

const model = defineModel<number>({ required: true });

const modelStr = computed({
  get: () => model.value.toString(),
  set: (value: string) => {
    let v = parseFloat(value);
    if (isNaN(v)) return;

    model.value = v;
  },
});

defineEmits(['blur']);
</script>
