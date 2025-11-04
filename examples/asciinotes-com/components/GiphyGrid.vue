<template>
  <div class="w-full h-96 overflow-y-scroll text-sm" ref="containerRef"></div>
</template>

<script setup lang="ts">
import { renderGrid } from '@giphy/js-components';
import { GiphyFetch } from '@giphy/js-fetch-api';
import type { IGif } from '@giphy/js-types';
import { throttle } from 'throttle-debounce';

import { GiphySearchMode } from '~/types';

const emit = defineEmits<{
  (e: 'select', gif: IGif): void;
}>();

const props = defineProps<{
  search: string;
  defaultSearch: string;
  searchMode: GiphySearchMode;
}>();

watch(
  () => props.search,
  () => {
    grid?.remove();
    grid = makeGrid();
  },
);

watch(
  () => props.searchMode,
  () => {
    grid?.remove();
    grid = makeGrid();
  },
);

const containerRef = ref<HTMLElement | undefined>();

const gf = new GiphyFetch('hGyl344WYljbUoAeGVQCsDIP2G2KrWZO');

let grid: ReturnType<typeof makeGrid> | null = null;

function fetchGifs(offset: number) {
  const search = props.search || props.defaultSearch;
  return gf.search(search, {
    offset,
    limit: 25,
    type: props.searchMode.valueOf() as 'stickers' | 'gifs',
  });
}

const makeGrid = () => {
  const giphyElement = document.createElement('div');
  giphyElement.style.width = '100%';
  giphyElement.style.height = '100%';
  containerRef.value?.appendChild(giphyElement);

  const render = () => {
    return renderGrid(
      {
        width: (containerRef.value?.clientWidth ?? 0) - 12,
        fetchGifs,
        columns: 2,
        gutter: 6,
        noLink: true,
        noResultsMessage: "¯\\_(ツ)_/¯ couldn't find anything",
        onGifClick: (gif: IGif) => {
          emit('select', gif);
        },
      },
      giphyElement,
    );
  };
  const resizeRender = throttle(500, render);
  window.addEventListener('resize', resizeRender, false);
  const remove = render();
  return {
    remove: () => {
      remove();
      while (containerRef.value?.firstChild) {
        containerRef.value.removeChild(containerRef.value.firstChild);
      }
      window.removeEventListener('resize', resizeRender, false);
    },
  };
};

onMounted(() => {
  grid = makeGrid();
});

onUnmounted(() => {
  grid?.remove();
});
</script>
<style>
.giphy-grid {
  display: flex;
  background: var(--color-gray-300);
  padding: 6px;
  overflow-x: hidden;
}
.giphy-grid > div {
  margin: auto;
}
.giphy-grid img {
  background: white !important;
}
</style>
