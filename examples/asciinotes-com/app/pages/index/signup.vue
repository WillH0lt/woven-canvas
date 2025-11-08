<template>
  <ModalLogin @close="router.replace('/')" :signing-up="true" />
</template>

<script lang="ts" setup>
const router = useRouter();
</script>
