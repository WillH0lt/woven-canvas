<template>
  <UApp :toaster="toaster">
    <NuxtPage />
  </UApp>
</template>

<script lang="ts" setup>
const title = "AsciiNotes - Markdown-Inspired Note-Taking for Programmers";
const description =
  "A minimal, markdown-inspired note-taking app for programmers.";

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  twitterCard: "summary_large_image",
});

const toaster = {
  position: "top-center" as const,
};
</script>
