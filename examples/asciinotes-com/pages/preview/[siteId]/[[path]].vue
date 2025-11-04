<template>
  <SiteView :siteId="siteId" :path="path" :isPreview="true"></SiteView>
</template>

<script setup lang="ts">
const route = useRoute();
const siteId = ref(route.params.siteId as string);
const path = ref(route.params.path as string);
</script>
