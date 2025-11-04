<template>
  <div class="w-full h-full">
    <div
      ref="reference"
      class="w-full h-full bg-cover"
      :class="{
        hovered: hovered,
        selected: selected,
      }"
      :style="{
        'background-image': `url(${part.src})`,
        'background-size':
          part.width / (part.srcWidth / part.srcHeight) > part.height ? 'cover' : 'contain',
      }"
    ></div>
    <!-- <img
      ref="reference"
      class="w-full h-full max-w-none"
      :class="{
        hovered: hovered,
        selected: selected,
      }"
      :src="part.src"
    /> -->
    <Teleport to="body">
      <div ref="floating" v-if="edited" :style="floatingStyles">
        <MenuPart />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Part } from '@prisma/client';

defineProps<{
  part: Readonly<Part>;
  hovered?: boolean;
  selected?: boolean;
  edited?: boolean;
}>();

const reference = useTemplateRef('reference');
const floating = useTemplateRef('floating');

const { floatingStyles } = useMenus(reference, floating, { placement: 'top' });

// const calculatedHeight = part.width / (Part.srcWidth / Part.srcHeight);
</script>

<style scoped>
.tape-cover {
  background-size: cover;
}
.tape-contain {
  background-size: contain;
}
</style>
