export const useFontStore = defineStore('font', () => {
  const loadedFonts = reactive<string[]>(['Figtree']);

  async function loadFont(fontFamily: string): Promise<void> {
    if (loadedFonts.includes(fontFamily)) {
      return;
    }

    return new Promise((resolve) => {
      const href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}&display=block`;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = (): void => {
        resolve();
      };
      document.head.appendChild(link);

      loadedFonts.push(fontFamily);
    });
  }

  return {
    loadFont,
  };
});
