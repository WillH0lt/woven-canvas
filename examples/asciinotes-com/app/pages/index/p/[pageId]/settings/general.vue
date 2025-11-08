<template>
  <div class="flex flex-col gap-8 mt-32 pb-32">
    <ElementSection title="Site Settings">
      <ElementInput
        class="w-full"
        title="Site Title"
        :maxlength="255"
        v-model="siteTitle"
        :placeholder="site.name"
      />
      <ElementTextArea title="Site Description" :maxlength="255" v-model="siteDescription" />
    </ElementSection>

    <ElementSection title="Site Images">
      <ElementImageInput
        title="Favicon"
        :width="64"
        :height="64"
        :upload-path="siteAssetsPath"
        v-model="favicon"
      />
      <ElementImageInput
        title="Social Preview"
        :width="1200"
        :height="630"
        :upload-path="siteAssetsPath"
        v-model="ogImage"
      />
    </ElementSection>

    <ElementSection title="Google Analytics">
      <ElementInput
        class="w-full"
        title="Google Analytics Measurement ID"
        placeholder="G-XXXXXXXXXX"
        :maxlength="24"
        v-model="googleAnalyticsId"
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

const siteStore = useSiteStore();
const user = useCurrentUser();
const site = computed(() => siteStore.site!);

const siteAssetsPath = computed(() => `/users/${user.value?.uid}/sites/${site.value.id}`);

const elementSaveBannerRef = ref<InstanceType<typeof ElementSaveBanner> | null>(null);

const siteTitle = ref<string>('');
const siteDescription = ref<string>('');
const favicon = ref<string>('');
const ogImage = ref<string>('');
const googleAnalyticsId = ref<string>('');

watchEffect(() => {
  siteTitle.value = site.value.title;
  siteDescription.value = site.value.description;
  favicon.value = site.value.favicon;
  ogImage.value = site.value.ogImage;
  googleAnalyticsId.value = site.value.googleAnalyticsId;
});

const isChanged = computed(() => {
  return (
    siteTitle.value !== site.value.title ||
    siteDescription.value !== site.value.description ||
    favicon.value !== site.value.favicon ||
    ogImage.value !== site.value.ogImage ||
    googleAnalyticsId.value !== site.value.googleAnalyticsId
  );
});

function reset() {
  siteTitle.value = site.value.title;
  siteDescription.value = site.value.description;
  favicon.value = site.value.favicon;
  ogImage.value = site.value.ogImage;
  googleAnalyticsId.value = site.value.googleAnalyticsId;
}

async function save() {
  await siteStore.updateSite({
    title: siteTitle.value,
    description: siteDescription.value,
    favicon: favicon.value,
    ogImage: ogImage.value,
    googleAnalyticsId: googleAnalyticsId.value,
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
