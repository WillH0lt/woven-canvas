<template>
  <div ref="topBarRef" class="flex">
    <div class="flex items-center h-10 mr-4 text-gray-300" v-if="studioStore.saving">
      <ElementLoadingIcon class="scale-[0.2]" />
      <div class="ml-4">saving</div>
    </div>
    <div class="flex h-10 mr-4 shadow rounded-2xl bg-gray-300">
      <div
        class="flex items-center h-full px-4 hover:bg-darken transition-colors cursor-pointer rounded-l-2xl"
        :class="{ 'bg-primary text-gray-300': pageStylesVisible }"
        @click="pageStylesVisible = !pageStylesVisible"
        data-tooltip="Page Styles"
      >
        <SvgoPalette class="w-4" />
      </div>
      <a
        class="flex items-center h-full px-4 hover:bg-darken transition-colors cursor-pointer"
        data-tooltip="Preview"
        :href="previewUrl"
        target="_blank"
        @click.prevent="goToPreview"
      >
        <SvgoEye class="w-4" />
      </a>

      <div
        class="flex items-center h-full px-4 hover:bg-darken transition-colors cursor-pointer rounded-r-2xl"
        @click="router.replace({ name: `studio-pageId-settings-general` })"
        data-tooltip="Settings"
      >
        <SvgoGear class="w-4" />
      </div>
    </div>

    <div class="flex h-10 shadow rounded-2xl bg-gray-300">
      <div
        class="flex items-center h-full px-4 hover:bg-darken transition-colors cursor-pointer rounded-2xl"
        :class="{ 'bg-primary text-white': publishVisible }"
        @click="publishVisible = !publishVisible"
      >
        Publish
      </div>
    </div>

    <Transition name="popdown">
      <StudioSettingsPageStyles
        class="w-96"
        v-if="pageStylesVisible"
        @close="pageStylesVisible = false"
      />
    </Transition>
    <Transition name="popdown">
      <StudioSettingsPublish v-if="publishVisible" @close="publishVisible = false" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const studioStore = useStudioStore();
const siteStore = useSiteStore();

const topBarRef = ref<HTMLElement | null>(null);
useTooltips(topBarRef, 'bottom');

const pageStylesVisible = ref(false);
const publishVisible = ref(false);

const previewUrl = computed(() => {
  if (siteStore.currentPage === undefined) {
    return '';
  }

  const { siteId, path } = siteStore.currentPage;

  return router.resolve(`/preview/${siteId}/${path}`).href;
});

async function goToPreview() {
  await studioStore.save();

  window.open(previewUrl.value, '_blank');
}
</script>
