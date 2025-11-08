<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    title="Are you sure you want to delete this page?"
    class="divide-y-0"
  >
    <template #footer>
      <div class="flex gap-2 w-full">
        <UButton
          class="ml-auto"
          variant="ghost"
          color="neutral"
          label="cancel"
          @click="emit('close', false)"
        />
        <UButton
          variant="ghost"
          color="error"
          label="Delete"
          @click="emit('close', true)"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: [boolean] }>();

// confirm modal on enter key
onMounted(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      emit("close", true);
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });
});
</script>
