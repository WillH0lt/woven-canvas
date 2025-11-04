<template>
  <div
    class="bg-gray-700 w-64 text-gray-300 p-2 drop-shadow-md rounded-xl max-h-32 overflow-y-auto"
    v-on-click-outside.bubble="() => emit('hide')"
    @wheel.stop
  >
    <div v-for="page in siteStore.sortedPages" :key="page.id" class="w-full pl-4 mb-1">
      <div
        class="flex items-center w-full rounded hover:text-gray-100 px-2 py-1 cursor-pointer transition-colors"
        @click="emit('select', page)"
      >
        <div class="mr-2">/</div>
        <div class="flex-1 overflow-hidden" v-if="page.path !== ''">
          <div class="w-full overflow-ellipsis overflow-hidden whitespace-nowrap">
            {{ page.path.replace('/', ' / ') }}
          </div>
        </div>
        <SvgoHouse class="w-3 mr-2" v-else></SvgoHouse>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { vOnClickOutside } from '@vueuse/components';

import type { Page } from '@prisma/client';

const siteStore = useSiteStore();

const emit = defineEmits<{
  (e: 'hide'): void;
  (e: 'select', page: Page): void;
}>();
</script>
