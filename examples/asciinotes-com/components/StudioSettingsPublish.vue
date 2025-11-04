<template>
  <StudioSettings @close="$emit('close')" side="right">
    <a
      class="w-full text-center font-bold"
      v-if="siteStore.liveVersion"
      :href="`${requestUrl.protocol}//${url}`"
      target="_blank"
    >
      {{ url }}
    </a>

    <div class="mb-4" v-if="siteStore.liveVersion">
      last published: {{ useTimeAgo(siteStore.liveVersion.createdAt) }}
    </div>
    <ElementButton
      class="w-full h-10 !bg-gray-400"
      @click="router.replace({ name: 'studio-pageId-settings-domains' })"
    >
      Add Domain
    </ElementButton>
    <ElementButton
      class="w-full h-10"
      @click="publish"
      :loading="publishing"
      :showCheckAfterLoading="true"
    >
      Publish
    </ElementButton>
    <div class="text-error" v-if="publishingError">{{ publishingError }}</div>
  </StudioSettings>
</template>

<script setup lang="ts">
const emit = defineEmits(['close']);

const siteStore = useSiteStore();
const studioStore = useStudioStore();
const requestUrl = useRequestURL();
const router = useRouter();

const url = computed(() => {
  if (siteStore.site?.domain) {
    return `${siteStore.site.domain}`;
  }

  return `${siteStore.site?.slug}.${requestUrl.host}`;
});

const publishing = ref(false);
const publishingError = ref<string | null>(null);
async function publish() {
  if (publishing.value) return;

  publishing.value = true;
  publishingError.value = null;

  try {
    await studioStore.save();
    await siteStore.publish();
  } catch (error) {
    if (error instanceof Error) {
      publishingError.value = error.message;
    } else {
      publishingError.value = 'Something went wrong';
    }
  } finally {
    publishing.value = false;
  }
}
</script>
