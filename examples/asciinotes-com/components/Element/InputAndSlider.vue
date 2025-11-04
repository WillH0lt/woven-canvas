<template>
  <div class="grid grid-cols-3 items-center">
    <div>{{ label }}</div>
    <ElementInput
      v-model="input"
      :suffix="suffix"
      @blur="handleInputBlur"
      :background="background"
    />
    <ElementSlider
      v-model="model"
      :min="sliderMin"
      :max="sliderMax"
      :step="step"
      class="ml-4"
      @blur="$emit('blur')"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  sliderMin: number;
  sliderMax: number;
  min: number;
  max: number;
  label: string;
  step?: number;
  suffix?: string;
  background?: string;
}>();

const model = defineModel<number>({ required: true });
const emit = defineEmits(['blur', 'update']);

const input = ref<string>('');

watchEffect(() => {
  input.value = `${model.value}`;
});

watch(input, (value) => {
  let v = parseFloat(value);
  if (isNaN(v)) return;
  if (v < props.min || v > props.max) return;

  model.value = v;
  emit('update', model.value);
});

function handleInputBlur(): void {
  let v = parseFloat(input.value);
  if (isNaN(v)) {
    input.value = `${model.value}`;
    return;
  }

  if (v < props.min) {
    v = props.min;
  } else if (v > props.max) {
    v = props.max;
  }

  model.value = v;
  input.value = `${model.value}`;

  emit('blur');
}
</script>
