import { ModalView } from "~/types";

export const useAppStore = defineStore("app", () => {
  const sideMenuOpen = ref(true);

  return {
    sideMenuOpen,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot));
}
