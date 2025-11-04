<template>
  <img
    class="cursor-pointer hover:scale-90 transition-transform duration-200"
    src="/img/text.png"
    @click="
      emit('select', {
        tag: PartTag.Text,
        width: 4,
        height: 35,
        innerHtml: `&nbsp;`,
      })
    "
  />
</template>

<script setup lang="ts">
import { PartTag } from '@prisma/client';
import type { Part } from '@prisma/client';

const emit = defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();
</script>
