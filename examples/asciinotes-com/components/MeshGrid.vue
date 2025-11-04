<template>
  <div class="w-full h-96 overflow-y-scroll text-sm">
    <div class="grid grid-cols-2 gap-4 p-4">
      <img
        v-for="model in models"
        :key="model.id"
        class="w-full rounded-lg cursor-pointer mx-auto"
        @click="emit('select', model.download)"
        :src="model.thumbnail"
        alt="Model Image"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Prisma } from '@prisma/client';

const { $client } = useNuxtApp();
type Model = Prisma.PromiseReturnType<typeof $client.mesh.get.query>[number];

const emit = defineEmits<{
  (e: 'select', model: string): void;
}>();

const models = ref<Model[]>([]);

const props = defineProps<{
  search: string;
  defaultSearch: string;
}>();

watch(
  () => props.search,
  async () => {
    let search = props.search || props.defaultSearch;
    models.value = await $client.mesh.get.query({
      search,
      limit: 25,
      page: 0,
    });
  },
  { immediate: true },
);
</script>
