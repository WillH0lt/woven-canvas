<template>
  <div class="flex m-2 items-center">
    <div class="mr-auto font-bold select-none">AsciiNotes</div>
    <UTooltip text="Create a new page">
      <UButton
        class="cursor-pointer hover:bg-gray-200"
        icon="i-lucide-square-pen"
        size="lg"
        color="neutral"
        variant="ghost"
        @click="pageStore.addPageAndNavigate()"
      />
    </UTooltip>
  </div>
</template>

<script lang="ts" setup>
const pageStore = usePageStore();
</script>
