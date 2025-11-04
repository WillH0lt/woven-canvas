<template>
  <div
    class="absolute flex inset-0 overflow-x-hidden"
    :class="{
      'overflow-y-hidden': !isVertical,
    }"
    :style="{
      backgroundColor: page.backgroundColor,
    }"
    @wheel.prevent
  >
    <div
      ref="runnerContainerRef"
      class="relative origin-top-left runner-container overflow-hidden w-full min-h-full"
      :style="{
        height: isVertical ? `${scrollLength}rem` : 'auto',
      }"
      @wheel.prevent
    >
      <div
        :style="{
          transform: isVertical ? 'translateX(50vw)' : 'translateY(50dvh)',
        }"
      >
        <img
          v-for="tile in tiles"
          :key="tile.id"
          :src="tile.url"
          class="absolute pointer-events-none select-none"
          :style="{
            left: `${tile.xi * TILE_WIDTH}rem`,
            top: `${tile.yi * TILE_HEIGHT}rem`,
            width: `${TILE_WIDTH}rem`,
            height: `${TILE_HEIGHT}rem`,
            minWidth: `${TILE_WIDTH}rem`,
            minHeight: `${TILE_HEIGHT}rem`,
          }"
        />

        <div
          v-for="(part, idx) in parts"
          :style="{
            position: 'absolute',
            left: `${part.left}rem`,
            top: `${part.top}rem`,
            width: `${part.width}rem`,
            height: `${part.height}rem`,
            fontSize: `${part.fontSize}rem`,
            ...getStartTransform(part),
          }"
        >
          <component
            :is="partComponents[part.tag]"
            class="w-full h-full"
            :key="part.id"
            :id="part.id"
            :part="part"
            :live="true"
            :style="{
              backgroundColor: part.backgroundColor,
              zIndex: idx,
              transform: `rotateZ(${part.rotateZ}rad)`,
              opacity: part.opacity,
            }"
          >
            <div v-if="part.innerHtml !== ''" v-html="part.innerHtml"></div>
          </component>
        </div>

        <div
          v-if="!isVertical"
          :style="{
            position: 'absolute',
            left: `${scrollLength}rem`,
            width: `10px`,
            height: `10px`,
          }"
        ></div>
      </div>
    </div>
    <div v-if="showBranding" class="fixed overflow-hidden w-full h-full pointer-events-none">
      <a
        class="hover-trigger pointer-events-auto absolute bottom-8 left-8 h-14 w-10 cursor-pointer text-primary hover:scale-[20] hover:-translate-x-32 hover:translate-y-48 hover:text-primary-light transition-[transform,color] duration-700"
        href="https://scrolly.page"
        target="_blank"
      >
        <SvgoIceCream class="absolute h-14" />
        <div class="absolute left-[24.5px] top-[10.25px] rotate-45 flex flex-col items-center">
          <div class="text-[1px] translate-y-[1px] font-semibold">Made with</div>
          <div class="text-[3px] font-logo">ScrollyPage</div>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Page, Part } from '@prisma/client';
import { ScrollDirection, EffectDirection } from '@prisma/client';
import { Tag } from '@scrolly-page/shared';
import type { Runner } from '@scrolly-page/studio';
import omit from 'lodash.omit';
import { LexoRank } from 'lexorank';
import { getEffectTransform, multiplyTransforms } from '@scrolly-page/effects';
import type { Transform } from '@scrolly-page/effects';

import { TILE_WIDTH, TILE_HEIGHT, SCROLL_END_PADDING } from '~/packages/studio/src/constants';
import { ConcreteComponent } from 'vue';

const partComponents: Record<string, ConcreteComponent | string> = {
  [Tag.Image]: resolveComponent('PartImage'),
  [Tag.Text]: resolveComponent('PartText'),
  [Tag.Note]: resolveComponent('PartNote'),
  [Tag.Shape]: resolveComponent('PartShape'),
  [Tag.Button]: resolveComponent('PartButton'),
  [Tag.Tape]: resolveComponent('PartTape'),
  // [Tag.Mesh]: resolveComponent('PartMesh'),
};

const props = defineProps<{
  isPreview?: boolean;
  siteId?: string;
  path?: string;
}>();
const tenant = useTenant();

const { initialize: initializeAnalytics } = useGtag();
const requestUrl = useRequestURL();

const { $client } = useNuxtApp();
const runnerContainerRef = ref();
const showBranding = ref(false);

// There are 4 different ways to access the site
// 1. custom domain: <myCustomDomain>/<path>
// 2. subdomain: <version>_<site>.scrolly.page/<path>
// 3. live subdomain: <site>.scrolly.page/<path>
// 4. preview: scrolly.page/preview/<siteId>/<path>

let response: Awaited<ReturnType<typeof $client.site.get.query>>;
if (props.isPreview) {
  if (!props.siteId) {
    throw new Error('siteId is required for preview');
  }
  response = await $client.site.getPreview.query({
    siteId: props.siteId,
    path: props.path || '',
  });

  // update all links to point to the preview page
  for (const part of response.pages[0].parts) {
    if (part.href && part.href.startsWith('/')) {
      part.href = `/preview/${props.siteId}${part.href}`;
    }

    if (part.innerHtml) {
      part.innerHtml = part.innerHtml.replace(
        /href="\/([^"]+)"/g,
        `href="/preview/${props.siteId}/$1"`,
      );
    }
  }
} else {
  const url = new URL(requestUrl.href);
  let hostname = url.hostname;

  if (hostname.startsWith('www.')) {
    hostname = hostname.substring(4);
  }

  if (hostname.startsWith('192.168.')) {
    hostname = 'localhost';
  }

  if (hostname.endsWith('.scrolly.page') || hostname.endsWith('.localhost')) {
    showBranding.value = true;
  }

  let path = url.pathname.substring(1);

  let siteSlug: string | null = null;
  let versionSlug = 'live';
  const tenantParts = tenant.split('_');

  if (hostname === 'scrolly.page' || hostname === 'localhost') {
    siteSlug = 'scrolly-page-home';
    path = props.path || '';
  } else if (tenantParts.length === 2) {
    siteSlug = tenantParts[0];
    versionSlug = tenantParts[1];
  } else if (tenantParts.length === 1) {
    siteSlug = tenantParts[0] || null;
  } else {
    throw new Error('Invalid subdomain');
  }

  response = await $client.site.get.query({
    domain: hostname,
    siteSlug,
    versionSlug,
    path,
  });
}

const site = ref(omit(response, ['pages']));
const page = ref(omit(response.pages[0], ['parts', 'tiles', 'groups', 'linkStyles']));
const linkStyles = ref(response.pages[0].linkStyles);

const parts = ref(
  response.pages[0].parts
    .map((part) => omit(part, ['effects']))
    .sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank))),
);

const groups = ref(response.pages[0].groups.map((group) => omit(group, ['effects'])));
const effects = ref(
  response.pages[0].parts
    .flatMap((part) => part.effects)
    .concat(response.pages[0].groups.flatMap((group) => group.effects)),
);
const tiles = ref(response.pages[0].tiles);

const fontFamilies = new Set(parts.value.map((part) => part.fontFamily));
const isVertical = computed(() => page.value?.scrollDirection === ScrollDirection.Vertical);
const scrollLength = getScrollLength();
const fontSize = getFontSize(page.value!);

const title = page.value?.title || site.value?.title || site.value?.name || '';
const description = page.value?.description || site.value?.description || '';

useSeoMeta({
  title: () => title,
  ogTitle: () => title,
  description: () => description,
  ogDescription: () => description,
  ogImage: () => page.value?.ogImage || site.value?.ogImage,
  twitterCard: 'summary_large_image',
});

useFavicon(() => site.value?.favicon || '/favicon.ico', {
  rel: 'icon',
});

const { cssString } = useLinkStyles(linkStyles);

useHead({
  style: [
    {
      children: `:root { font-size: ${fontSize}; }`,
    },
    {
      children: cssString,
    },
  ],
  link: [
    ...Array.from(fontFamilies).map((fontFamily) => ({
      preconnect: true,
      dnsPrefetch: true,
      rel: 'stylesheet',
      href: `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}`,
    })),
  ],
});

let runner: Runner | null = null;

onMounted(async () => {
  const { Runner, defaultBrush, defaultLayers, PointerAction, WheelAction } = await import(
    '@scrolly-page/studio'
  );

  runner = new Runner();

  await runner.initialize(runnerContainerRef.value, {
    page: page.value,
    blocks: parts.value,
    groups: groups.value,
    effects: effects.value,
    tiles: tiles.value,
    inputSettings: {
      actionLeftMouse: PointerAction.TouchOnlyPan,
      actionMiddleMouse: PointerAction.None,
      actionRightMouse: PointerAction.None,
      actionWheel: WheelAction.Scroll,
      actionModWheel: WheelAction.Scroll,
    },
    layers: defaultLayers,
    brush: defaultBrush,
  });

  runner.start();

  if (site.value.googleAnalyticsId) {
    initializeAnalytics(site.value.googleAnalyticsId);
  }
});

onBeforeUnmount(async () => {
  await runner?.destroy();
});

function getScrollLength(): number {
  let scrollTrackLength = 0;

  for (const part of parts.value) {
    const aabb = getAabb(part);

    // const partEffects = effects.value.filter(
    //   (effect) => effect.partId === part.id || (part.groupId && effect.groupId === part.groupId),
    // );

    // let deltaParallel = 0;
    // for (const effect of partEffects) {
    //   deltaParallel += effect.deltaParallel;
    // }

    const end = isVertical.value ? aabb[3] : aabb[2];

    scrollTrackLength = Math.max(scrollTrackLength, end);
  }

  return scrollTrackLength + SCROLL_END_PADDING;
}

function getAabb(part: Part): [number, number, number, number] {
  const halfWidth = part.width / 2;
  const halfHeight = part.height / 2;
  const center = [part.left + halfWidth, part.top + halfHeight];

  let angle = part.rotateZ % Math.PI;
  if (angle < 0) angle += Math.PI;
  if (angle > Math.PI / 2) angle = Math.PI - angle;

  const w = part.width * Math.cos(angle) + part.height * Math.sin(angle);
  const h = part.width * Math.sin(angle) + part.height * Math.cos(angle);
  return [center[0] - w / 2, center[1] - h / 2, center[0] + w / 2, center[1] + h / 2];
}

function getFontSize(page: Page): string {
  let fontSize = '1px';
  if (page.scrollDirection === ScrollDirection.Horizontal) {
    if (page.minHeight) {
      fontSize = `min(calc(100dvh / ${page.minHeight}), ${fontSize})`;
    }
    if (page.maxHeight) {
      fontSize = `max(calc(100dvh / ${page.maxHeight}), ${fontSize})`;
    }
  } else {
    if (page.minWidth) {
      fontSize = `min(calc(100vw / ${page.minWidth}), ${fontSize})`;
    }
    if (page.maxWidth) {
      fontSize = `max(calc(100vw / ${page.maxWidth}), ${fontSize})`;
    }
  }

  return fontSize;
}

function getStartTransform(part: Part): { transform: string; opacity: string } {
  const backwardEffects = effects.value
    .filter(
      (effect) => effect.partId === part.id || (part.groupId && effect.groupId === part.groupId),
    )
    .filter((effect) => effect.direction === EffectDirection.Backwards);

  let transform: Transform = [1, 0, 0, 1, 0, 0, 1];
  for (const effect of backwardEffects) {
    const t = getEffectTransform(effect, 0, page.value.scrollDirection);
    transform = multiplyTransforms(transform, t);
  }

  return {
    transform: `matrix(${transform[0]}, ${transform[1]}, ${transform[2]}, ${transform[3]}, ${transform[4]}, ${transform[5]})`,
    opacity: `${transform[6]}`,
  };
}
</script>

<style>
.font-logo {
  font-family: 'Lobster Two', cursive;
}
</style>
