<template>
  <div class="flex flex-col gap-8 mt-32 pb-32">
    <ElementSection title="Page Settings">
      <ElementInput
        class="w-full"
        title="Page Title"
        :placeholder="siteStore.site?.title || siteStore.site?.name"
        :maxlength="255"
        v-model="pageTitle"
      />
      <ElementTextArea
        title="Page Description"
        :placeholder="siteStore.site?.description"
        :maxlength="255"
        v-model="pageDescription"
      />
    </ElementSection>

    <ElementSection title="Page Image">
      <ElementImageInput
        title="Social Preview"
        :width="1200"
        :height="630"
        :upload-path="pageAssetsPath"
        v-model="ogImage"
      />
    </ElementSection>
  </div>

  <Transition name="pop">
    <ElementSaveBanner ref="elementSaveBannerRef" v-if="isChanged" @reset="reset" @save="save" />
  </Transition>
</template>

<script setup lang="ts">
import ElementSaveBanner from '~/components/Element/SaveBanner.vue';
import { shakeElement } from '~/utils';

const user = useCurrentUser();
const route = useRoute();
const siteStore = useSiteStore();
const pageId = computed(() => route.params.settingsPageId as string);
const page = computed(() => siteStore.pages.find((page) => page.id === pageId.value));

const elementSaveBannerRef = ref<InstanceType<typeof ElementSaveBanner> | null>(null);

const pageAssetsPath = computed(() => `/users/${user.value?.uid}/pages/${pageId.value}`);

const pageTitle = ref<string>('');
const pageDescription = ref<string>('');
const ogImage = ref<string>('');

watchEffect(() => {
  if (!page.value) return;
  pageTitle.value = page.value.title;
  pageDescription.value = page.value.description;
  ogImage.value = page.value.ogImage;
});

const isChanged = computed(() => {
  if (!page.value) return false;

  return (
    pageTitle.value !== page.value.title ||
    pageDescription.value !== page.value.description ||
    ogImage.value !== page.value.ogImage
  );
});

function reset() {
  if (!page.value) return;

  pageTitle.value = page.value.title;
  pageDescription.value = page.value.description;
  ogImage.value = page.value.ogImage;
}

async function save() {
  await siteStore.updatePage(pageId.value, {
    title: pageTitle.value,
    description: pageDescription.value,
    ogImage: ogImage.value,
  });
}

onBeforeRouteLeave(async (to, from, next) => {
  if (isChanged.value) {
    elementSaveBannerRef.value?.highlight();
    shakeElement('siteSettings');
    next(false);
  } else {
    next();
  }
});
</script>
