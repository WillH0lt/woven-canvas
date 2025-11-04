<template>
  <div ref="componentRef" class="flex h-10 shadow rounded-2xl bg-gray-300">
    <div
      class="flex items-center h-full px-4 hover:bg-darken transition-colors cursor-pointer rounded-l-2xl"
      @click="router.push('/')"
      data-tooltip="Back Home"
    >
      <SvgoArrowLeft class="w-4" />
    </div>
    <div
      ref="siteNameRef"
      class="flex items-center px-2 hover:bg-darken transition-colors cursor-pointer"
      @click="siteName = siteStore.site?.name ?? ''"
    >
      <input
        class="max-w-56 w-full rounded bg-gray-200 focus:bg-gray-100 placeholder:text-gray-400 p-0"
        v-if="siteName !== null"
        v-model="siteName"
        @blur="renameSite"
        @keydown.enter="renameSite"
        @click.stop
      />
      <div class="max-w-56 overflow-ellipsis overflow-hidden whitespace-nowrap" v-else>
        {{ siteStore.site?.name }}
      </div>
    </div>
    <div
      class="flex items-center h-full pl-3 pr-3 hover:bg-darken transition-colors cursor-pointer rounded-r-2xl"
      :class="{
        'bg-primary text-white': pagesVisible,
      }"
      data-tooltip="Pages"
      @click="pagesVisible = !pagesVisible"
    >
      <div class="flex">
        <div class="mr-2">/</div>
        <div v-if="siteStore.currentPage?.path !== ''" class="mr-1">
          {{ siteStore.currentPage?.path.replace('/', ' / ') }}
        </div>
        <SvgoHouse class="w-3 mr-2" v-else></SvgoHouse>
      </div>
    </div>

    <Transition name="popdown">
      <StudioSettingsPages v-if="pagesVisible" @close="pagesVisible = false" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();

const pagesVisible = ref(false);

const componentRef = ref<HTMLElement | null>(null);
useTooltips(componentRef, 'bottom');

const siteNameRef = ref<HTMLElement | null>(null);
const siteName = ref<string | null>(null);
async function renameSite() {
  if (siteName.value !== null) {
    await siteStore.updateSite({ name: siteName.value });
    siteName.value = null;
  }
}

watch(siteName, async (value, oldValue) => {
  if (value !== null && oldValue === null) {
    await nextTick();
    siteNameRef.value?.querySelector('input')?.focus();
  }
});
</script>
