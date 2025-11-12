import { TRPCClientError } from "@trpc/client";
import type { User } from "#shared/prisma/browser";

export const useAppStore = defineStore("app", () => {
  const { $trpc } = useNuxtApp();
  const toast = useToast();
  const pageStore = usePageStore();
  const currentUser = useCurrentUser();

  const sideMenuOpen = ref(true);

  const user = ref<User | null>(null);

  const isAnonymous = computed(() => {
    if (!currentUser.value) return true;

    return (
      currentUser.value.providerData.length === 0 ||
      currentUser.value.isAnonymous
    );
  });

  const isLoggedIn = computed(() => {
    return !!currentUser.value && !isAnonymous.value;
  });

  async function fetchUserData(): Promise<User> {
    const key = `user-${currentUser.value?.uid}`;

    const { data, error } = await useAsyncData(key, async () =>
      $trpc.user.fetch.query()
    );

    if (error.value) {
      toast.add({
        title: "Error fetching profile",
        description:
          error.value instanceof TRPCClientError
            ? error.value.cause?.message
            : "An unexpected error occurred",
        color: "error",
      });
      throw error.value;
    }

    if (!data.value) {
      throw new Error("Failed to fetch user profile");
    }

    user.value = data.value;
    pageStore.userPages = data.value.userPages;
    pageStore.pages = data.value.pages;
    return data.value;
  }

  async function acceptTerms(): Promise<User> {
    user.value = await $trpc.user.acceptTerms.mutate();

    return user.value;
  }

  function clearUserData() {
    user.value = null;
    pageStore.userPages = [];
    pageStore.pages = [];
  }

  return {
    fetchUserData,
    acceptTerms,
    clearUserData,

    user,
    isAnonymous,
    isLoggedIn,
    sideMenuOpen,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot));
}
