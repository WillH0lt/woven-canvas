<template>
  <div>{{ page?.icon }}</div>
</template>
<script setup lang="ts">
const pageStore = usePageStore();
const route = useRoute();

const page = computed(() => {
  return pageStore.pages.find((p) => p.id === route.params.pageId);
});
</script>
