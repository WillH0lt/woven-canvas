import tippy, { createSingleton } from 'tippy.js';

export const useTooltips = (
  rootRef: Ref<HTMLElement | null>,
  side: 'top' | 'left' | 'bottom' | 'right',
): void => {
  onMounted(() => {
    if (!rootRef.value) {
      console.warn('Root element is not defined');
      return;
    }

    const buttons = rootRef.value.querySelectorAll('[data-tooltip]');

    const tippyInstances = [];
    for (const button of buttons) {
      const instance = tippy(button, {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        content: button.getAttribute('data-tooltip')!,
        duration: 50,
        animation: 'fade',
        arrow: false,
      });
      tippyInstances.push(instance);
    }

    createSingleton(tippyInstances, {
      delay: [700, 50],
      arrow: false,
      offset: [0, 5],
      placement: side,
    });
  });
};
