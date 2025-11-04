<template>
  <ElementSection title="Versions" class="mt-32 pb-32">
    <div class="grid grid-cols-4 px-4" v-for="(version, i) in siteStore.versions" :key="version.id">
      <a
        class="text-lg"
        :href="`${requestUrl.protocol}//${siteStore.site?.slug}_${version.slug}.${requestUrl.host}`"
        target="_blank"
        >{{ i === 0 ? 'latest' : version.slug }}</a
      >
      <div>{{ useTimeAgo(version.createdAt) }}</div>

      <div class="text-right">
        <ElementButton
          class="h-10 w-20"
          :class="{
            '!bg-gray-400': siteStore.site?.liveVersionId !== version.id,
          }"
          @click="siteStore.deployVersion(version.id)"
        >
          <template v-if="siteStore.site?.liveVersionId === version.id">Live</template>
          <template v-else>Deploy</template>
        </ElementButton>
      </div>

      <ElementDropdown
        class="text-right"
        :menuItems="[
          {
            text: 'Delete',
            onClick: () => siteStore.deleteVersion(version.id),
          },
        ]"
      >
        <SvgoEllipsis />
      </ElementDropdown>
    </div>
    <div class="w-full text-center my-32 text-gray-500" v-if="siteStore.versions.length === 0">
      Publish your site to generate a version.
    </div>
  </ElementSection>
</template>

<script setup lang="ts">
const requestUrl = useRequestURL();
const siteStore = useSiteStore();
</script>
