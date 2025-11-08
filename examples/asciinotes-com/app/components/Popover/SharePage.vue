<template>
  <div class="flex flex-col p-4 min-w-80 text-sm">
    <div class="flex items-center">
      <div class="mr-auto">Share this page</div>
      <USwitch v-model="isShared" size="sm" />
    </div>
    <div v-if="isShared" class="mt-4">
      <div class="flex items-center">
        <div class="max-w-48">Anyone with the link</div>
        <USelect
          class="ml-auto"
          size="sm"
          v-model="shareMode"
          :items="shareModeItems"
          variant="ghost"
        />
      </div>
      <div class="flex justify-center w-full mt-4">
        <UButton :trailingIcon="copyButtonIcon" @click="handleCopy" size="sm">
          Copy Link
        </UButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ShareMode } from "@prisma/client";
import { useClipboard } from "@vueuse/core";

const isShared = ref(false);

const shareModeItems = ref([
  {
    label: "Can view",
    value: ShareMode.ReadOnly,
  },
  {
    label: "Can edit",
    value: ShareMode.ReadWrite,
  },
]);
const shareMode = ref(ShareMode.ReadOnly);

const linkToCopy = ref("https://your-website.com/your-page"); // The link you want to copy
const { copy } = useClipboard({ source: linkToCopy });

const copyButtonIcon = ref("i-lucide-copy");
function handleCopy() {
  copy().then(() => {
    copyButtonIcon.value = "i-lucide-check";
    setTimeout(() => {
      copyButtonIcon.value = "i-lucide-copy";
    }, 2000);
  });
}
</script>
