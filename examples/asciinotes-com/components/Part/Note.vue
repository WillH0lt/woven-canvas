<template>
  <div class="w-full h-full">
    <div
      ref="reference"
      class="note-shadow w-full h-full relative p-[8%]"
      :class="{
        hovered: hovered,
        selected: selected,
      }"
    >
      <PartText :part="part" :typed="typed">
        <slot></slot>
      </PartText>
    </div>
    <Teleport to="body">
      <div ref="floating" v-if="edited" :style="floatingStyles">
        <MenuPart :colorButtonVisible="true" />
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
  typed?: boolean;
}>();

const reference = useTemplateRef('reference');
const floating = useTemplateRef('floating');

const { floatingStyles } = useMenus(reference, floating, { placement: 'top' });
</script>

<style scoped>
.note-shadow {
  box-shadow:
    rgba(15, 23, 31, 0.6) 0px 4px 5px -6px,
    rgba(15, 23, 31, 0.4) 0px 11px 13px -12px,
    rgba(15, 23, 44, 0.02) 0px 48px 10px -12px inset;
}
</style>
