import { ModalView } from '~/types';

export const useAppStore = defineStore('app', () => {
  const modalView = ref(ModalView.None);
  const notification = ref('');

  function notify(message: string): void {
    notification.value = message;
    setTimeout(() => {
      notification.value = '';
    }, 5000);
  }

  return {
    modalView,
    notification,
    notify,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot));
}
