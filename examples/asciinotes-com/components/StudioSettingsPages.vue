<template>
  <StudioSettings @close="$emit('close')">
    <div ref="elementRef" class="w-full">
      <div class="flex items-center justify-center w-full mb-1" ref="addButtonRef">
        <div class="ml-2">Pages</div>

        <div class="ml-auto mr-1 flex items-center">
          <ElementPremiumBadge v-if="!canAddPages"></ElementPremiumBadge>
          <SvgoPlus
            class="w-8 rounded transition-colors p-2"
            :class="{
              'cursor-pointer hover:bg-gray-300': canAddPages,
              'opacity-50': !canAddPages,
            }"
            @click="canAddPages && siteStore.addPage()"
            data-tooltip="Add Page"
          />
        </div>
      </div>

      <div v-for="page in siteStore.sortedPages" :key="page.id" class="w-full pl-4 mb-1">
        <div
          class="flex items-center w-full rounded hover:bg-gray-300 hover:text-black px-2 py-1 cursor-pointer transition-colors"
          :class="{ 'bg-gray-300 text-black': page.id === route.params.pageId }"
          @click="navigateToPage(page.id)"
        >
          <div class="mr-2">/</div>
          <div class="flex-1 overflow-hidden" v-if="page.path !== ''">
            <input
              class="w-full rounded bg-gray-200 focus:bg-gray-100 placeholder:text-gray-400 p-0"
              v-if="pageToRename === page"
              v-model="pageName"
              @blur="renamePage"
              @keydown.enter="renamePage"
              @click.stop
            />
            <div v-else class="w-full overflow-ellipsis overflow-hidden whitespace-nowrap">
              {{ page.path.replace('/', ' / ') }}
            </div>
          </div>
          <SvgoHouse class="w-3 mr-2" v-else></SvgoHouse>
          <ElementDropdown
            class="ml-auto pl-2"
            v-if="page.path !== ''"
            :menuItems="[
              {
                text: 'Rename',
                onClick: () => (pageToRename = page),
              },
              {
                text: 'Delete',
                onClick: () => (pageToDelete = page),
              },
            ]"
            size="small"
            @click.stop
          >
            <SvgoEllipsis />
          </ElementDropdown>
        </div>
      </div>
    </div>
    <ElementDialog
      v-if="pageToDelete"
      @close="pageToDelete = null"
      :text="`Are you sure want to delete page ${pageToDelete.path}?`"
      :buttons="[
        {
          text: 'Cancel',
          onClick: () => (pageToDelete = null),
        },
        {
          text: 'Delete',
          onClick: async () => {
            await deletePage(pageToDelete!.id);
            pageToDelete = null;
          },
        },
      ]"
    ></ElementDialog>
  </StudioSettings>
</template>

<script setup lang="ts">
import type { Page } from '@prisma/client';
const emit = defineEmits(['close']);

const planStore = usePlanStore();
const siteStore = useSiteStore();
const studioStore = useStudioStore();
const route = useRoute();
const router = useRouter();

const elementRef = ref<HTMLElement | null>(null);

const addButtonRef = ref<HTMLElement | null>(null);
useTooltips(addButtonRef, 'bottom');

const canAddPages = computed(() => {
  return siteStore.pages.length < planStore.pageLimit;
});

async function navigateToPage(pageId: string) {
  await studioStore.save();
  await router.replace({ name: 'studio-pageId', params: { pageId } });
}

const pageToRename = ref<Page | null>(null);
const pageName = ref('');
async function renamePage() {
  // Step 1: Remove any characters that aren't letters, numbers, hyphens, or slashes
  let sanitized = pageName.value.replace(/[^a-zA-Z0-9\-\/]/g, '');

  // Step 2: Replace multiple consecutive slashes with a single slash
  sanitized = sanitized.replace(/\/+/g, '/');

  // Step 3: Remove slash from the beginning if it exists
  sanitized = sanitized.replace(/^\//, '');

  // Step 4: Remove slash from the end if it exists
  sanitized = sanitized.replace(/\/$/, '');

  // Step 5: Handle empty segments between slashes
  sanitized = sanitized
    .split('/')
    .filter((segment) => segment.length > 0)
    .join('/');

  // Step 6: Convert to lowercase
  sanitized = sanitized.toLowerCase();

  await siteStore.updatePage(pageToRename.value!.id, {
    path: sanitized,
  });
  pageToRename.value = null;
}

watch(pageToRename, async (page) => {
  pageName.value = page?.path || '';
  await nextTick();
  if (page) {
    elementRef.value?.querySelector('input')?.focus();
    elementRef.value?.querySelector('input')?.select();
  }
});

const pageToDelete = ref<Page | null>(null);
async function deletePage(pageId: string) {
  await siteStore.deletePage(pageId);

  if (route.params.pageId === pageId) {
    const homePageId = siteStore.pages.find((page) => page.path === '')?.id;
    if (homePageId) {
      router.replace({ name: 'studio-pageId', params: { pageId: homePageId } });
    } else {
      router.replace('/');
    }
  }
}
</script>
