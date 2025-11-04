<template>
  <div class="w-full h-full">
    <div ref="reference" class="w-full h-full outline outline-4 outline-primary rounded-md"></div>
    <Teleport to="body">
      <div ref="floating" v-if="studioStore.selectedParts.length > 1" :style="floatingStyles">
        <MenuPart />
      </div>
    </Teleport>
  </div>
</template>
<script setup lang="ts">
import type { Part } from '@prisma/client';

defineProps<{
  part: Readonly<Part>;
}>();

const studioStore = useStudioStore();

const reference = useTemplateRef('reference');
const floating = useTemplateRef('floating');

const { floatingStyles } = useMenus(reference, floating, { placement: 'top' });
</script>
