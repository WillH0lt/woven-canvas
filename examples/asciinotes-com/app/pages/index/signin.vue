<template>
  <ModalLogin @close="router.replace('/')" :signing-up="false" />
</template>

<script lang="ts" setup>
const router = useRouter();
</script>
