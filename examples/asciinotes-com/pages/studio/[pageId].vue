<template>
  <div class="absolute flex inset-0 w-full h-full pointer-events-none">
    <div class="relative flex-1">
      <div
        ref="studioRef"
        class="absolute flex inset-0 overflow-hidden -z-50"
        :style="{ backgroundColor: siteStore.currentPage?.backgroundColor }"
      >
        <div
          ref="studioContainerRef"
          class="flex-1 relative origin-top-left"
          :class="{
            'translate-x-1/2': isVertical,
            'translate-y-1/2': !isVertical,
          }"
        >
          <div
            v-if="isVertical && studioStore.draggedParts.length > 0"
            class="absolute pointer-events-none"
            :style="{
              left: `${(page?.minWidth ?? 0) / 2}px`,
              top: `${0}px`,
              width: `${1e6}px`,
              height: `${1e6}px`,
            }"
          >
            <div class="w-full h-full bg-gray-300 opacity-30"></div>
          </div>

          <div
            v-if="isVertical && studioStore.draggedParts.length > 0"
            class="absolute pointer-events-none"
            :style="{
              left: `${-1e6 - (page?.minWidth ?? 0) / 2}px`,
              top: `${0}px`,
              width: `${1e6}px`,
              height: `${1e6}px`,
            }"
          >
            <div class="w-full h-full bg-gray-300 opacity-30"></div>
          </div>

          <div
            v-for="(part, idx) in studioStore.sortedParts"
            :key="part.id"
            :style="{
              position: 'absolute',
              left: `${part.left}px`,
              top: `${part.top}px`,
              width: `${part.width}px`,
              height: `${part.height}px`,
              fontSize: `${part.fontSize}px`,
            }"
          >
            <component
              :is="partComponents[part.tag]"
              class="w-full h-full"
              :id="part.id"
              :part="part"
              :hovered="studioStore.hoveredParts.includes(part.id)"
              :selected="studioStore.selectedParts.includes(part.id)"
              :dragged="studioStore.draggedParts.includes(part.id)"
              :edited="studioStore.editedParts.includes(part.id)"
              :typed="studioStore.typedParts.includes(part.id)"
              :style="{
                backgroundColor: part.backgroundColor,
                touchAction: 'none',
                userSelect: 'none',
                zIndex: idx,
                transform: `rotateZ(${part.rotateZ}rad)`,
                opacity: part.opacity,
              }"
            >
              <div v-if="part.innerHtml !== ''" v-html="part.innerHtml"></div>
            </component>
          </div>
        </div>
      </div>
      <StudioOverlay class="relative h-screen">
        <div
          class="absolute bottom-4 right-4 h-10 shadow rounded-2xl bg-gray-300 z-10 pointer-events-auto"
          v-if="studioStore.needsRecentering"
        >
          <div
            class="flex items-center h-full px-4 hover:bg-darken transition-colors cursor-pointer rounded-2xl"
            @click="() => studioStore.centerViewport()"
          >
            Center View
          </div>
        </div>

        <StudioToolbar
          class="absolute bottom-0 left-1/2 -translate-x-1/2"
          @wheel.stop
          @selectPart="selectPart"
        >
        </StudioToolbar>

        <StudioSiteSettings class="absolute top-4 left-4 pointer-events-auto"> </StudioSiteSettings>
        <StudioTopBar class="absolute top-4 right-4 pointer-events-auto"> </StudioTopBar>

        <ModalSaving v-if="showSavingModal" />

        <ElementNotification v-if="appStore.notification" :text="appStore.notification" />

        <Transition name="fade">
          <div v-if="route.path.includes('settings')" class="pointer-events-auto">
            <NuxtLayout>
              <NuxtPage />
            </NuxtLayout>
          </div>
        </Transition>
      </StudioOverlay>
    </div>
    <Transition name="slide">
      <div
        v-if="studioStore.sideMenuKind !== SideMenuKind.None"
        class="w-96 h-full transition-[width] duration-1000 pointer-events-auto"
      >
        <StudioSideMenu />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Part } from '@prisma/client';
import { ScrollDirection, PartTag } from '@prisma/client';
import { Tag } from '@scrolly-page/shared';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import { ConcreteComponent } from 'vue';

import { SubmenuKind, SideMenuKind } from '~/types';

const route = useRoute();
const appStore = useAppStore();
const siteStore = useSiteStore();
const studioStore = useStudioStore();
const planStore = usePlanStore();
const fontStore = useFontStore();

const studioContainerRef = useTemplateRef('studioContainerRef');
const studioRef = useTemplateRef('studioRef');

const partComponents: Record<string, ConcreteComponent | string> = {
  [Tag.Image]: resolveComponent('PartImage'),
  [Tag.Select]: resolveComponent('PartSelect'),
  [Tag.BufferZone]: resolveComponent('PartBufferZone'),
  [Tag.Invisible]: resolveComponent('PartInvisible'),
  [Tag.Rail]: resolveComponent('PartRail'),
  [Tag.SnapLine]: resolveComponent('PartSnapLine'),
  [Tag.Text]: resolveComponent('PartText'),
  [Tag.TransformBox]: resolveComponent('PartTransformBox'),
  [Tag.TransformHandle]: resolveComponent('PartTransformHandle'),
  [Tag.Note]: resolveComponent('PartNote'),
  [Tag.Shape]: resolveComponent('PartShape'),
  [Tag.Button]: resolveComponent('PartButton'),
  [Tag.Tape]: resolveComponent('PartTape'),
  // [Tag.Mesh]: resolveComponent('PartMesh'),
};

definePageMeta({
  middleware: ['authenticated'],
});

const { cssString } = useLinkStyles(() => studioStore.linkStyles);

useHead({
  bodyAttrs: {
    class: 'sl-theme-dark overflow-hidden',
  },
  style: [{ children: cssString }],
});

// useHead({
//   style: [{ children: cssString }],
// });

const isVertical = computed(
  () => siteStore.currentPage?.scrollDirection === ScrollDirection.Vertical,
);

const page = computed(() => siteStore.currentPage);

let saveInterval: NodeJS.Timeout;
onMounted(async () => {
  const pageId = route.params.pageId as string;

  await Promise.all([
    siteStore.fetchSiteByPageId(pageId),
    studioStore.initializeStudio(studioContainerRef.value!, pageId),
    planStore.loadSubscriptions(),
  ]);

  studioStore.updateSiteLimits({
    partsCount: planStore.partLimit,
  });

  studioStore.parts.forEach((part) => {
    if (part.innerHtml !== '') {
      fontStore.loadFont(part.fontFamily);
    }
  });

  window.addEventListener('beforeunload', handleBeforeUnload);

  saveInterval = setInterval(save, 10000);

  // prevent scrolling on the studio
  // scrolling can happen when text input extends beyond viewport
  studioRef.value!.addEventListener('scroll', () => {
    studioRef.value!.scrollTo(0, 0);
  });
});

onBeforeUnmount(async () => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  clearInterval(saveInterval);
  await studioStore.destroyStudio();

  studioStore.reset();
});

function save(): boolean {
  if (!studioStore.saving && studioStore.submenu === SubmenuKind.None && studioStore.needsUpdate) {
    studioStore.save();
    return true;
  }

  return false;
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  const didSave = save();
  if (didSave) {
    event.preventDefault();
    return true;
  }

  return false;
}

const showSavingModal = ref(false);
const showSavingModalTimeout = ref<NodeJS.Timeout | null>(null);
onBeforeRouteLeave(async (to, from) => {
  showSavingModalTimeout.value = setTimeout(() => {
    showSavingModal.value = true;
  }, 200);
  await save();
  clearTimeout(showSavingModalTimeout.value!);
  return true;
});

function selectPart(part: Partial<Part>) {
  const keys = Object.keys(PartTag);
  const parts = studioStore.parts.filter((part) => keys.includes(part.tag) && part.opacity === 1);

  if (parts.length > planStore.partLimit) {
    appStore.notify(
      `On the free plan each page can have a maximum of ${planStore.partLimit} parts.`,
    );
    return;
  }

  studioStore.selectPart(part);
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.popdown-enter-active,
.popdown-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.popdown-enter-from,
.popdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-enter-active,
.slide-leave-active {
  transition: width 0.5s;
}

.slide-enter-from,
.slide-leave-to {
  width: 0;
}
</style>
