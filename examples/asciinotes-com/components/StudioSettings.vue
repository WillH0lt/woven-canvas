<template>
  <!-- <div class="absolute inset-0 z-20 cursor-default" > -->
  <div
    class="absolute w-80 top-[72px] py-2 px-2 bg-gray-200 flex flex-col items-center gap-2 rounded-lg shadow"
    :class="{
      'left-4': side === 'left',
      'right-4': side === 'right',
    }"
    v-on-click-outside.bubble="() => $emit('close')"
    @click.stop
  >
    <slot></slot>
  </div>
  <!-- </div> -->
</template>

<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';

const emit = defineEmits(['close']);

interface Props {
  side?: 'left' | 'right';
}

withDefaults(defineProps<Props>(), {
  side: 'left',
});

onBeforeRouteUpdate(async (to, from, next) => {
  emit('close');
  next();
});
</script>
