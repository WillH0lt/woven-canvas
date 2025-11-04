<template>
  <div
    class="text-xs bg-primary text-white ml-2 py-1 px-2 rounded cursor-pointer"
    @click="router.replace({ name: 'studio-pageId-settings-plans' })"
  >
    Premium
  </div>
</template>
<script setup lang="ts">
const router = useRouter();
</script>
