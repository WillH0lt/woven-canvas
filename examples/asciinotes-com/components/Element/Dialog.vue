<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20"
    @click="canClose && $emit('close')"
  >
    <div
      class="relative w-full max-w-[420px] p-2 bg-gray-300 flex flex-col items-center gap-8"
      @click.stop
    >
      <svgoX class="w-6 ml-auto cursor-pointer" @click="$emit('close')" />
      <div class="px-4 text-center text-lg">{{ props.text }}</div>
      <div class="flex w-full justify-center">
        <ElementButton
          class="m-2 min-w-32 h-12 text-lg"
          v-for="button in extendedButtons"
          @click="handleClick(button)"
          :loading="button.loading"
        >
          {{ button.text }}
        </ElementButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { DialogButton } from '~/types';

const emit = defineEmits(['close']);
const props = defineProps<{ text: string; buttons: Array<DialogButton> }>();

const canClose = ref(false);
setTimeout(() => (canClose.value = true), 250);

interface ExtendedButton extends DialogButton {
  loading?: boolean;
}

const extendedButtons = ref(
  props.buttons.map((button) => ({
    ...button,
    loading: false,
  })),
);

async function handleClick(item: ExtendedButton) {
  item.loading = true;
  try {
    await item.onClick();
  } catch (error) {
    console.error('Failed handleClick', error);
  }
  item.loading = false;
}
</script>
