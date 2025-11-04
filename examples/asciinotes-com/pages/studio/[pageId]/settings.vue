<template>
  <div id="siteSettings" class="absolute w-full h-fit cursor-auto bg-white" @wheel.stop>
    <div class="flex h-screen overflow-y-auto">
      <!-- Sidebar -->
      <div class="w-[calc(50vw-384px)] min-w-52"></div>

      <div
        class="absolute top-0 bottom-0 pt-16 w-[calc(50vw-384px)] min-w-52 bg-gray-200 max-h-screen overflow-y-auto"
      >
        <div class="w-44 flex flex-col gap-1 ml-auto mr-4">
          <div class="font-bold ml-4">Site Settings</div>
          <div
            class="flex gap-4 py-2 px-4 rounded-lg cursor-pointer hover:bg-gray-300 hover:text-black transition-colors"
            :class="{
              'bg-gray-300 text-black': route.name === tab.route,
            }"
            v-for="tab in siteTabs"
            :key="tab.route"
            @click="router.replace({ name: tab.route })"
          >
            <div>{{ tab.title }}</div>
          </div>

          <div class="font-bold ml-4 mt-4">Page Settings</div>
          <div
            class="flex gap-2 py-2 px-4 rounded-lg cursor-pointer hover:bg-gray-300 hover:text-black transition-colors"
            :class="{
              'bg-gray-300 text-black':
                (route.name as string).includes('settings-page') &&
                page.id === route.params.settingsPageId,
            }"
            v-for="page in siteStore.sortedPages"
            :key="page.id"
            @click="
              router.replace({
                name: 'studio-pageId-settings-page-settingsPageId',
                params: {
                  settingsPageId: page.id,
                },
              })
            "
          >
            <div class="flex">
              <div class="mr-2">/</div>
              <div v-if="page.path !== ''">{{ page.path.replace('/', ' / ') }}</div>
              <SvgoHouse class="w-3 mr-2" v-else></SvgoHouse>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 max-w-screen-md px-8">
        <NuxtPage v-if="siteStore.site" />
      </div>

      <!-- Esc Button -->
      <div class="">
        <div class="sticky top-16 mr-8 flex flex-col items-center gap-2">
          <div
            class="flex items-center justify-center rounded-full border-2 border-gray-500 p-2 w-10 h-10 hover:bg-gray-200 transition-colors cursor-pointer"
            @click="router.replace({ name: `studio-pageId` })"
          >
            <SvgoX class="w-full h-full text-gray-500" />
          </div>
          <div class="text-sm text-gray-500">ESC</div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();

const siteTabs = [
  {
    title: 'General',
    route: 'studio-pageId-settings-general',
  },
  {
    title: 'Domains',
    route: 'studio-pageId-settings-domains',
  },
  {
    title: 'Versions',
    route: 'studio-pageId-settings-versions',
  },
  {
    title: 'Plans',
    route: 'studio-pageId-settings-plans',
  },
];
</script>

<style>
.pop-enter-active,
.pop-leave-active {
  transition: bottom 0.4s;
}

.pop-enter-from,
.pop-leave-to {
  bottom: -100px;
}

.shake {
  animation: shake 0.3s;
}

@keyframes shake {
  0% {
    transform: translate(0, 0);
  }
  16.66% {
    transform: translate(-5px, 5px);
  }
  33.33% {
    transform: translate(5px, -5px);
  }
  50% {
    transform: translate(-5px, 0);
  }
  66.66% {
    transform: translate(0, -5px);
  }
  82.33% {
    transform: translate(5px, 5px);
  }
  100% {
    transform: translateX(0, 0);
  }
}
</style>
