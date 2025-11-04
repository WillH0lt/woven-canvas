<template>
  <div
    class="cursor-pointer aspect-square group translate-y-4"
    @click="
      () => {
        emit('select', {
          tag: PartTag.Note,
          width: 200,
          height: 200,
          innerHtml: `&nbsp;`,
          stretched: true,
          backgroundColor: colors[colorOffset % colors.length],
        });
        colorOffset++;
      }
    "
  >
    <div
      v-for="i in noteCount"
      :key="i"
      class="relative group-hover:last:-translate-y-2 group-hover:last:scale-105 transition-transform duration-200"
    >
      <div
        class="absolute w-20 aspect-square note"
        :style="{
          transform: `rotate(${8 * (i - noteCount)}deg)`,
          backgroundColor: colors[(noteCount - i + colorOffset) % colors.length],
          left: `${12 + (i - noteCount) * 5}px`,
          top: 0,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PartTag } from '@prisma/client';
import type { Part } from '@prisma/client';

const emit = defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();

const noteCount = ref(3);
const colorOffset = ref(0);

const colors = ['#cdfc93ff', '#ff7ecdff', '#71d7ffff', '#ce81ffff', '#fee09bff'];
</script>

<style scoped>
.note {
  box-shadow:
    rgba(15, 23, 31, 0.6) 0px 4px 5px -6px,
    rgba(15, 23, 31, 0.4) 0px 11px 13px -12px,
    rgba(15, 23, 44, 0.02) 0px 48px 10px -12px inset;
}
</style>
