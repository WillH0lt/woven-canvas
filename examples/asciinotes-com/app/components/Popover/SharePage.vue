<template>
  <div class="flex flex-col p-4 min-w-80 text-sm">
    <div class="flex items-center">
      <div class="mr-auto">Share this page</div>
      <USwitch
        v-model="isShared"
        size="sm"
        @update:modelValue="handleIsSharedUpdate"
      />
    </div>
    <div v-if="isShared" class="mt-4">
      <div class="flex items-center">
        <div class="max-w-48">Anyone with the link</div>
        <USelect
          class="ml-auto mb-1"
          v-model="shareMode"
          @update:modelValue="handleShareModeUpdate"
          :items="[
            {
              label: 'can view',
              value: ShareMode.ReadOnly,
            },
            {
              label: 'can edit',
              value: ShareMode.ReadWrite,
            },
          ]"
          variant="outline"
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
import { ShareMode, type Page } from "@prisma/client";
import { useClipboard } from "@vueuse/core";

const props = defineProps<{
  page: Page;
}>();

const runtimeConfig = useRuntimeConfig();
const pageStore = usePageStore();

const isShared = ref(props.page.shareMode !== ShareMode.None);

const shareMode = ref(
  props.page.shareMode === ShareMode.ReadWrite
    ? ShareMode.ReadWrite
    : ShareMode.ReadOnly
);

async function handleIsSharedUpdate(value: boolean): Promise<void> {
  shareMode.value = ShareMode.ReadOnly;
  if (value) {
    await pageStore.updatePageShareMode({
      pageId: props.page.id,
      updates: {
        shareMode: shareMode.value,
      },
    });
  } else {
    await pageStore.updatePageShareMode({
      pageId: props.page.id,
      updates: {
        shareMode: ShareMode.None,
      },
    });
  }
}

async function handleShareModeUpdate(value: ShareMode): Promise<void> {
  await pageStore.updatePageShareMode({
    pageId: props.page.id,
    updates: {
      shareMode: value,
    },
  });
}

const linkToCopy = ref(`${runtimeConfig.public.baseUrl}/p/${props.page.id}`);
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
