import type { Page, Site, Version } from '@prisma/client';
import omit from 'lodash.omit';

export const useSiteStore = defineStore('site', () => {
  const { $client } = useNuxtApp();
  const route = useRoute();
  const studioStore = useStudioStore();

  const site = ref<Site | null>(null);
  const versions = ref<Version[]>([]);
  const pages = ref<Page[]>([]);

  // sort by page createdAt
  const sortedPages = computed(() =>
    pages.value.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  );

  const liveVersion = computed(() =>
    versions.value.find((v) => v.id === site.value?.liveVersionId),
  );

  const currentPage = computed(() => pages.value.find((p) => p.id === route.params.pageId));

  async function fetchSiteByPageId(pageId: string): Promise<void> {
    const response = await $client.site.getByPageId.query({ pageId, versionId: null });

    site.value = omit(response, ['pages', 'versions']);
    pages.value = response.pages;
    versions.value = response.versions;
  }

  async function updateSite(updates: Partial<Site>): Promise<void> {
    if (!site.value) {
      throw new Error('Site not initialized');
    }

    site.value = await $client.site.update.mutate({
      siteId: site.value.id,
      updates,
    });
  }

  async function addPage(): Promise<Page> {
    if (!site.value) {
      throw new Error('Site not initialized');
    }

    const response = await $client.page.create.mutate({ siteId: site.value.id });

    pages.value.push(response);

    return response;
  }

  async function updatePage(pageId: string, updates: Partial<Page>): Promise<void> {
    const response = await $client.page.update.mutate({
      pageId,
      updates,
    });
    pages.value = pages.value.map((p) => (p.id === pageId ? response : p));

    if (pageId === currentPage.value?.id) {
      studioStore.updatePageInStudio(response);
    }
  }

  async function deletePage(pageId: string): Promise<void> {
    await $client.page.delete.mutate({ pageId });

    pages.value = pages.value.filter((p) => p.id !== pageId);
  }

  async function deleteVersion(versionId: string): Promise<void> {
    site.value = await $client.version.delete.mutate({ versionId });
    versions.value = versions.value.filter((v) => v.id !== versionId);
  }

  async function deployVersion(versionId: string): Promise<void> {
    if (!site.value) {
      throw new Error('Site not initialized');
    }

    if (site.value.liveVersionId === versionId) {
      return;
    }

    site.value = await $client.version.deploy.mutate({ versionId });
  }

  async function publish(): Promise<void> {
    if (!site.value) {
      throw new Error('Site not initialized');
    }
    const response = await $client.site.publish.mutate({ siteId: site.value.id });
    site.value = omit(response, ['versions']);
    versions.value = response.versions;
  }

  return {
    site,
    pages,
    sortedPages,
    versions,
    liveVersion,
    currentPage,

    fetchSiteByPageId,
    updateSite,
    addPage,
    updatePage,
    deletePage,
    deleteVersion,
    deployVersion,
    publish,
  };
});
