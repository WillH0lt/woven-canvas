<template>
  <UApp :toaster="toaster">
    <NuxtPage />
  </UApp>
</template>

<script lang="ts" setup>
import { signInAnonymously } from "firebase/auth";

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

// Ensure there's always an anonymous user
const auth = useFirebaseAuth()!;
const currentUser = useCurrentUser();
onMounted(() => {
  if (!currentUser.value) {
    signInAnonymously(auth);
  }
});
</script>
