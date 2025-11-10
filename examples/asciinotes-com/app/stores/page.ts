import type { Page, UserPage } from "@prisma/client";
import { LexoRank } from "@dalet-oss/lexorank";
import { TRPCClientError } from "@trpc/client";

function getRankBounds(userPages: UserPage[]): {
  minRank: LexoRank | null;
  maxRank: LexoRank | null;
} {
  let minRank = LexoRank.max();
  let maxRank = LexoRank.min();

  userPages.forEach((up) => {
    const currentRank = LexoRank.parse(up.rank);
    if (currentRank.compareTo(minRank) === -1) {
      minRank = currentRank;
    }
    if (currentRank.compareTo(maxRank) === 1) {
      maxRank = currentRank;
    }
  });

  return {
    minRank: minRank === LexoRank.max() ? null : minRank,
    maxRank: maxRank === LexoRank.min() ? null : maxRank,
  };
}

export const usePageStore = defineStore("page", () => {
  const { $trpc } = useNuxtApp();
  const toast = useToast();
  const router = useRouter();

  const userPages = ref<UserPage[]>([]);
  const pages = ref<Page[]>([]);

  const activePage = computed(() => {
    const route = router.currentRoute.value;
    const pageId = route.params.pageId as string | undefined;
    if (!pageId) {
      return null;
    }
    return pages.value.find((p) => p.id === pageId) || null;
  });

  async function fetchPages(): Promise<UserPage[]> {
    const { data, error } = await useLazyAsyncData(
      "user-pages",
      async () => {
        try {
          const response = await $trpc.userPage.getAll.query();
          return response;
        } catch (error) {
          console.error("Error fetching pages:", error);
          throw error;
        }
      },
      {
        server: true, // Enable SSR
        default: () => [],
      }
    );

    if (error.value) {
      toast.add({
        title: "Error fetching pages",
        description:
          error.value instanceof TRPCClientError
            ? error.value.cause?.message
            : "An unexpected error occurred",
        color: "error",
      });
      throw error.value;
    }

    if (data.value) {
      userPages.value = data.value;
      pages.value = data.value.map((up) => up.page);
      return data.value;
    }

    return [];
  }

  async function addPageAndNavigate(): Promise<UserPage> {
    const { minRank } = getRankBounds(userPages.value);
    const rank = minRank?.genPrev() ?? LexoRank.middle();

    try {
      const response = await $trpc.page.createWithUserPage.mutate({
        page: {
          name: "Untitled Page",
          icon: "📋",
        },
        userPage: {
          rank: rank.toString(),
          isPinned: false,
        },
      });

      userPages.value.push(response);
      pages.value.push(response.page);

      router.push(`/p/${response.page.id}`);

      return response;
    } catch (error) {
      toast.add({
        title: "Error creating page",
        description:
          error instanceof TRPCClientError
            ? error.cause?.message
            : "An unexpected error occurred",
        color: "error",
      });
      throw error;
    }
  }

  async function updatePageName(
    input: Parameters<typeof $trpc.page.updateName.mutate>[0]
  ): Promise<Page> {
    let page = pages.value.find((p) => p.id === input.pageId);
    if (!page) {
      throw new Error("Page not found in store");
    }

    const updatedPage = { ...page, ...input.updates };

    pages.value = pages.value.map((p) =>
      p.id === input.pageId ? updatedPage : p
    );

    try {
      return await $trpc.page.updateName.mutate(input);
    } catch (error) {
      toast.add({
        title: "Error updating page",
        description:
          error instanceof TRPCClientError
            ? error.cause?.message
            : "An unexpected error occurred",
        color: "error",
      });
      throw error;
    }
  }

  async function updatePageShareMode(
    input: Parameters<typeof $trpc.page.updateShareMode.mutate>[0]
  ): Promise<Page> {
    let page = pages.value.find((p) => p.id === input.pageId);
    if (!page) {
      throw new Error("Page not found in store");
    }

    const updatedPage = { ...page, ...input.updates };

    pages.value = pages.value.map((p) =>
      p.id === input.pageId ? updatedPage : p
    );

    try {
      return await $trpc.page.updateShareMode.mutate(input);
    } catch (error) {
      toast.add({
        title: "Error updating page",
        description:
          error instanceof TRPCClientError
            ? error.cause?.message
            : "An unexpected error occurred",
        color: "error",
      });
      throw error;
    }
  }

  async function updateUserPage(
    input: Parameters<typeof $trpc.userPage.update.mutate>[0]
  ): Promise<UserPage> {
    let userPage = userPages.value.find((p) => p.pageId === input.pageId);
    if (!userPage) {
      throw new Error("User page not found in store");
    }

    const updatedUserPage = { ...userPage, ...input.updates };

    userPages.value = userPages.value.map((p) =>
      p.pageId === input.pageId ? updatedUserPage : p
    );

    try {
      return await $trpc.userPage.update.mutate(input);
    } catch (error) {
      toast.add({
        title: "Error updating page",
        description:
          error instanceof TRPCClientError
            ? error.cause?.message
            : "An unexpected error occurred",
        color: "error",
      });
      throw error;
    }
  }

  async function pinUserPage(pageId: string): Promise<UserPage> {
    const { minRank } = getRankBounds(userPages.value);
    const rank = minRank?.genPrev() ?? LexoRank.middle();

    return await updateUserPage({
      pageId,
      updates: {
        rank: rank.toString(),
        isPinned: true,
      },
    });
  }

  async function unpinUserPage(pageId: string): Promise<UserPage> {
    const { minRank } = getRankBounds(userPages.value);
    const rank = minRank?.genPrev() ?? LexoRank.middle();

    return await updateUserPage({
      pageId,
      updates: {
        rank: rank.toString(),
        isPinned: false,
      },
    });
  }

  async function deletePage(pageId: string): Promise<Page> {
    userPages.value = userPages.value.filter((p) => p.pageId !== pageId);
    pages.value = pages.value.filter((p) => p.id !== pageId);

    try {
      return await $trpc.page.delete.mutate({ pageId });
    } catch (error) {
      toast.add({
        title: "Error deleting page",
        description:
          error instanceof TRPCClientError
            ? error.cause?.message
            : "An unexpected error occurred",
        color: "error",
      });
      throw error;
    }
  }

  return {
    userPages,
    pages,
    activePage,

    fetchPages,
    addPageAndNavigate,
    updatePageName,
    updatePageShareMode,
    updateUserPage,
    pinUserPage,
    unpinUserPage,
    deletePage,
  };
});
