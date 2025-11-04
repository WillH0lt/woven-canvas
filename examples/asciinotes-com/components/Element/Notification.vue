<template>
  <div class="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 float-up">
    <span class="bg-primary p-2 whitespace-nowrap text-white">{{ props.text }}</span>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{ text: string }>();
</script>
<style scoped>
.float-up {
  animation: float-up 0.5s ease-out;
  animation-fill-mode: forwards;
}

@keyframes float-up {
  0% {
    bottom: -30px;
    opacity: 0;
  }
  100% {
    bottom: 30px;
    opacity: 1;
  }
}
</style>
