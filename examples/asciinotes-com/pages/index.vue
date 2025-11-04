<template>
  <HomeLayout v-if="currentUser">
    <HomeUserSites />
  </HomeLayout>
  <template v-else>
    <SiteView />
    <NuxtPage />
  </template>
</template>

<script lang="ts" setup>
import '@shoelace-style/shoelace/dist/themes/dark.css';

definePageMeta({
  layout: 'home',
});

useHead({
  bodyAttrs: {
    class: 'sl-theme-dark',
    style: `
      --sl-font-size-medium: 16px;
      --sl-border-radius-medium: 5px;
    `,
  },
});

const currentUser = useCurrentUser();
</script>
