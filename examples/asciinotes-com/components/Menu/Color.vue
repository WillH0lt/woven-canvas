<template>
  <div
    class="w-fit p-2 rounded-xl bg-gray-700 cursor-auto"
    v-on-click-outside="() => $emit('blur')"
  >
    <MenuColorPicker v-if="colorPickerVisible" v-model="color" />
    <MenuColorBubbles
      v-else
      v-model="color"
      @show-picker="colorPickerVisible = true"
      :palette="palette"
    />
  </div>
</template>

<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';

const emit = defineEmits<{
  (e: 'blur'): void;
}>();

interface Props {
  palette?: string[];
}

withDefaults(defineProps<Props>(), {
  palette: () => [
    '#000000',
    '#434343',
    '#ff3e41',
    '#ff8a43',
    '#ffeb7f',
    '#00c9a7',
    '#007ea7',
    '#6a58f2',
    '#ffffff',
  ],
});

const color = defineModel<string>({ required: true });

const colorPickerVisible = ref(false);

onUnmounted(() => {
  emit('blur');
});
</script>
