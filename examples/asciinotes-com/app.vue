<template>
  <NuxtPage />
</template>

<script lang="ts" setup>
const title = 'ScrollyPage - Create and Share Scrolly Pages Online';
const description =
  'Create and share scrolly pages online. Add text, images, and videos to your page.';

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  // ogImage: '/img/zinesForever.png',
  twitterCard: 'summary_large_image',
});
</script>
