import type { Effect, Group, LinkStyle, Page, Part, Tile } from '@prisma/client';
import { TextDecoration } from '@prisma/client';
import type { BrushKinds } from '@scrolly-page/brushes';
import type { StateDelta, Studio } from '@scrolly-page/studio';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { LexoRank } from 'lexorank';
import omit from 'lodash.omit';
import { v4 as uuid } from 'uuid';

import type { Brush, InputSettings, SiteLimits } from '~/packages/studio/src/types.js';
import {
  LayerKind,
  PointerAction,
  WheelAction,
  defaultBrush,
  defaultInputSettings,
  defaultLayers,
} from '~/packages/studio/src/types.js';
import { SideMenuKind, SubmenuKind } from '~/types/index.js';
import { hexToRgba } from '~/utils.js';

const DRAWING_INPUT_SETTINGS = {
  actionLeftMouse: PointerAction.Draw,
  actionMiddleMouse: PointerAction.Pan,
  actionRightMouse: PointerAction.Pan,
  actionWheel: WheelAction.Zoom,
  actionModWheel: WheelAction.Zoom,
};

export const useStudioStore = defineStore('studio', () => {
  const { $client } = useNuxtApp();
  const currentUser = useCurrentUser();
  const storage = useFirebaseStorage();

  const parts = ref<Part[]>([]);
  const groups = ref<Group[]>([]);
  const effects = ref<Effect[]>([]);
  const tiles = ref<Tile[]>([]);
  const linkStyles = ref<LinkStyle[]>([]);

  const hoveredParts = ref<string[]>([]);
  const selectedParts = ref<string[]>([]);
  const draggedParts = ref<string[]>([]);
  const editedParts = ref<string[]>([]);
  const typedParts = ref<string[]>([]);

  const sideMenuKind = ref(SideMenuKind.None);

  let studio: Studio | null = null;

  const inputSettings = ref<InputSettings>(defaultInputSettings);
  const brush = ref<Brush>(defaultBrush);
  const needsRecentering = ref(false);
  const saving = ref(false);
  const _submenu = ref(SubmenuKind.None);
  const prevStateBlobUrl = ref<string | null>(null);
  const currStateBlobUrl = ref<string | null>(null);
  const needsUpdate = computed(() => prevStateBlobUrl.value !== currStateBlobUrl.value);

  function getPartById(id: string): Part | undefined {
    return parts.value.find((part) => part.id === id);
  }

  const sortedParts = computed(() =>
    parts.value.sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank))),
  );

  async function initializeStudio(studioContainer: HTMLElement, pageId: string): Promise<void> {
    const { Studio } = await import('@scrolly-page/studio');

    studio = new Studio();

    const response = await $client.page.get.query({ pageId, versionId: null });

    const page = omit(response, ['parts', 'groups', 'tiles', 'linkStyles']);
    parts.value = response.parts.map((part) => omit(part, ['effects']));

    groups.value = response.groups.map((group) => omit(group, ['effects']));
    effects.value = response.parts
      .flatMap((part) => part.effects)
      .concat(response.groups.flatMap((group) => group.effects));
    tiles.value = response.tiles;
    linkStyles.value = response.linkStyles;

    await studio.initialize(studioContainer, {
      page,
      blocks: parts.value,
      groups: groups.value,
      effects: effects.value,
      tiles: tiles.value,
      inputSettings: defaultInputSettings,
      layers: defaultLayers,
      brush: defaultBrush,
    });

    studio.start();

    studio.viewport?.on('moved', (ev: { type: string }) => {
      if (ev.type === 'drag' || ev.type === 'wheel') {
        needsRecentering.value = true;
      }
    });

    studio.emitter.on('snapshot:move-state', (blobUrl: string) => {
      if (prevStateBlobUrl.value === null) {
        prevStateBlobUrl.value = blobUrl;
      }

      currStateBlobUrl.value = blobUrl;
    });

    studio.emitter.on('parts:add', (addedParts: Part[]) => {
      for (const addedPart of addedParts) {
        const part = parts.value.find((p) => p.id === addedPart.id);
        if (!part) {
          parts.value.push(addedPart);
        }
      }
    });

    studio.emitter.on('parts:update', (updatedParts: Part[]) => {
      for (let i = 0; i < updatedParts.length; i++) {
        const part = parts.value.find((p) => p.id === updatedParts[i].id);
        if (part) {
          parts.value.splice(parts.value.indexOf(part), 1, updatedParts[i]);
        }
      }
    });

    studio.emitter.on('parts:remove', (removedParts: Part[]) => {
      parts.value = parts.value.filter((part) => !removedParts.some((p) => p.id === part.id));
    });

    studio.emitter.on('parts:hover', (addedHoveredParts: Part[]) => {
      for (const hoveredPart of addedHoveredParts) {
        hoveredParts.value.push(hoveredPart.id);
      }
    });

    studio.emitter.on('parts:unhover', (removedHoveredParts: Part[]) => {
      hoveredParts.value = hoveredParts.value.filter(
        (hoveredPartId) => !removedHoveredParts.some((p) => p.id === hoveredPartId),
      );
    });

    studio.emitter.on('parts:select', (addedSelectedParts: Part[]) => {
      for (const selectedPart of addedSelectedParts) {
        if (!selectedParts.value.includes(selectedPart.id)) {
          selectedParts.value.push(selectedPart.id);
        }
      }
    });

    studio.emitter.on('parts:unselect', (removedSelectedParts: Part[]) => {
      selectedParts.value = selectedParts.value.filter(
        (selectedPartId) => !removedSelectedParts.some((p) => p.id === selectedPartId),
      );
    });

    studio.emitter.on('parts:dragged', (addedDraggedParts: Part[]) => {
      for (const draggedPart of addedDraggedParts) {
        draggedParts.value.push(draggedPart.id);
      }
    });

    studio.emitter.on('parts:undragged', (removedDraggedParts: Part[]) => {
      draggedParts.value = draggedParts.value.filter(
        (draggedPartId) => !removedDraggedParts.some((p) => p.id === draggedPartId),
      );
    });

    studio.emitter.on('parts:edited', (addedEditedParts: Part[]) => {
      for (const editedPart of addedEditedParts) {
        editedParts.value.push(editedPart.id);
      }
    });

    studio.emitter.on('parts:unedited', (removedEditedParts: Part[]) => {
      editedParts.value = editedParts.value.filter(
        (editedPartId) => !removedEditedParts.some((p) => p.id === editedPartId),
      );
    });

    studio.emitter.on('parts:typed', (addedTypedParts: Part[]) => {
      for (const typedPart of addedTypedParts) {
        typedParts.value.push(typedPart.id);
      }
    });

    studio.emitter.on('parts:untyped', (removedTypedParts: Part[]) => {
      typedParts.value = typedParts.value.filter(
        (typedPartId) => !removedTypedParts.some((p) => p.id === typedPartId),
      );
    });

    studio.emitter.on('groups:add', (addedGroups: Group[]) => {
      for (const addedGroup of addedGroups) {
        const group = groups.value.find((g) => g.id === addedGroup.id);
        if (!group) {
          groups.value.push(addedGroup);
        }
      }
    });

    studio.emitter.on('groups:update', (updatedGroups: Group[]) => {
      for (const updatedGroup of updatedGroups) {
        const group = groups.value.find((g) => g.id === updatedGroup.id);
        if (group) {
          Object.assign(group, updatedGroup);
        }
      }
    });

    studio.emitter.on('groups:remove', (removedGroups: Group[]) => {
      groups.value = groups.value.filter((group) => !removedGroups.some((g) => g.id === group.id));
    });

    studio.emitter.on('effects:add', (addedEffects: Effect[]) => {
      for (const addedEffect of addedEffects) {
        const effect = effects.value.find((e) => e.id === addedEffect.id);
        if (!effect) {
          effects.value.push(addedEffect);
        }
      }
    });

    studio.emitter.on('effects:update', (updatedEffects: Effect[]) => {
      for (const updatedEffect of updatedEffects) {
        const effect = effects.value.find((e) => e.id === updatedEffect.id);
        if (effect) {
          Object.assign(effect, updatedEffect);
        }
      }
    });

    studio.emitter.on('effects:remove', (removedEffects: Effect[]) => {
      effects.value = effects.value.filter(
        (effect) => !removedEffects.some((e) => e.id === effect.id),
      );
    });

    studio.emitter.on('tiles:add', (addedTiles: Tile[]) => {
      for (const addedTile of addedTiles) {
        const tile = tiles.value.find((t) => t.id === addedTile.id);
        if (!tile) {
          tiles.value.push(addedTile);
        }
      }
    });

    studio.emitter.on('tiles:update', (updatedTiles: Tile[]) => {
      for (const updatedTile of updatedTiles) {
        const tile = tiles.value.find((t) => t.id === updatedTile.id);
        if (tile) {
          Object.assign(tile, updatedTile);
        }
      }
    });

    studio.emitter.on('tiles:remove', (removedTiles: Tile[]) => {
      tiles.value = tiles.value.filter((tile) => !removedTiles.some((t) => t.id === tile.id));
    });
  }

  const selectedPart = computed(() => {
    if (selectedParts.value.length === 1) {
      return parts.value.find((part) => part.id === selectedParts.value[0]);
    }
    return null;
  });

  const selectedGroup = computed(() => {
    let groupId: string | null = null;
    for (const id of selectedParts.value) {
      const part = parts.value.find((p) => p.id === id);
      if (!part) {
        console.warn(`Part with id ${id} not found`);
        continue;
      }

      if (part.groupId === null) {
        return null;
      }

      if (groupId === null) {
        groupId = part.groupId;
      } else if (groupId !== part.groupId) {
        return null;
      }
    }

    const groupSize = parts.value.filter((p) => p.groupId === groupId).length;

    if (selectedParts.value.length !== groupSize) {
      return null;
    }

    return groupId;
  });

  const blobUrlMap = new Map<string, string>();
  async function applyDelta(delta: StateDelta): Promise<void> {
    if (!currentUser.value) {
      throw new Error('not logged in');
    }

    // parts.value = parts.value.filter((part) => !delta.removedParts.some((p) => p.id === part.id));
    // parts.value.push(...delta.addedParts);

    // parts.value = parts.value.map((part) => {
    //   const updatedPart = delta.updatedParts.find((p) => p.id === part.id);
    //   return updatedPart ?? part;
    // });

    // first upload any blobs
    const uploadPromises = [];
    for (const tile of [...delta.addedTiles, ...delta.updatedTiles]) {
      if (tile.url.startsWith('blob:')) {
        const storageFileRef = storageRef(
          storage,
          `/users/${currentUser.value.uid}/pages/${tile.pageId}/assets/tiles/${uuid()}.png`,
        );

        if (blobUrlMap.has(tile.url)) {
          tile.url = blobUrlMap.get(tile.url) ?? '';
          continue;
        }

        uploadPromises.push(
          (async (): Promise<void> => {
            const blob = await fetch(tile.url).then(async (r): Promise<Blob> => r.blob());
            const uploadTask = await uploadBytes(storageFileRef, blob);
            const url = await getDownloadURL(uploadTask.ref);

            blobUrlMap.set(tile.url, url);
            tile.url = url;
          })(),
        );
      }
    }

    await Promise.all(uploadPromises);

    await $client.page.applyDelta.mutate(delta);
  }

  async function save(): Promise<void> {
    if (!studio) {
      console.error('Studio not initialized');
      return;
    }

    saving.value = true;
    try {
      const delta = await studio.updateStateAndGetDelta();

      if (delta) {
        await applyDelta(delta);
        prevStateBlobUrl.value = currStateBlobUrl.value;
      }
    } catch (error) {
      console.error(error);
    } finally {
      saving.value = false;
    }
  }

  function addEffect(effect: Effect): void {
    studio?.emitter.emit('world:add-effect', effect);
  }

  function updateEffect(effect: Effect): void {
    studio?.emitter.emit('world:update-effect', effect);
  }

  function updateEffectNoSnapshot(effect: Effect): void {
    studio?.emitter.emit('world:update-effect-no-shapshot', effect);
  }

  function removeEffect(effect: Effect): void {
    studio?.emitter.emit('world:remove-effect', effect);
  }

  function updatePageInStudio(page: Partial<Page>): void {
    studio?.emitter.emit('world:update-page', page);
  }

  function updatePartInStudio(part: Part): void {
    studio?.emitter.emit('world:update-part', part);
  }

  function updatePartInStudioNosnapshot(part: Part): void {
    studio?.emitter.emit('world:update-part-without-snapshot', part);
  }

  function selectPart(part: Partial<Part>): void {
    studio?.emitter.emit('world:update-cursor', part);
  }

  function deselectAll(): void {
    studio?.emitter.emit('world:deselect-all');
  }

  function createSnapshot(): void {
    studio?.emitter.emit('world:create-snapshot');
  }

  function undo(): void {
    studio?.emitter.emit('world:undo');
  }

  function redo(): void {
    studio?.emitter.emit('world:redo');
  }

  function centerViewport(force = false): void {
    setTimeout(() => {
      (async (): Promise<void> => {
        await studio?.nextTick;
        await studio?.nextTick;
        await studio?.nextTick;

        if (needsRecentering.value || force) {
          studio?.emitter.emit('world:center-viewport');
        }
        needsRecentering.value = false;
      })().catch((err: unknown) => {
        console.error(err);
      });
    }, 0);
  }

  function getCurrentState(): string {
    return studio?.currStateBlobUrl ?? '';
  }

  function startInnerEdit(): void {
    studio?.emitter.emit('world:start-inner-edit');
  }

  function cancelInnerEdit(): void {
    studio?.emitter.emit('world:cancel-inner-edit');
  }

  function finishInnerEdit(): void {
    studio?.emitter.emit('world:finish-inner-edit');
  }

  function groupSelectedParts(): void {
    studio?.emitter.emit('world:group-selected-parts');
  }

  function ungroupSelectedParts(): void {
    studio?.emitter.emit('world:ungroup-selected-parts');
  }

  function deleteSelectedParts(): void {
    studio?.emitter.emit('world:delete-selected-parts');
  }

  function bringSelectedPartsForward(): void {
    studio?.emitter.emit('world:bring-selected-parts-forward');
  }

  function sendSelectedPartsBackward(): void {
    studio?.emitter.emit('world:send-selected-parts-backward');
  }

  function duplicateSelectedParts(): void {
    studio?.emitter.emit('world:duplicate-selected-parts');
  }

  async function nextTick(): Promise<void> {
    await studio?.nextTick;
  }

  function updateBrushColor(color: string, kind: BrushKinds): void {
    const [r, g, b, a] = hexToRgba(color);
    brush.value.red = r;
    brush.value.green = g;
    brush.value.blue = b;
    brush.value.alpha = a;
    brush.value.kind = kind;
  }

  function updateSiteLimits(siteLimits: SiteLimits): void {
    studio?.emitter.emit('world:update-site-limits', siteLimits);
  }

  function _useDefaultControls(): void {
    inputSettings.value = defaultInputSettings;
    studio?.emitter.emit('world:update-layer', {
      kind: LayerKind.Block,
      opacity: 1,
      active: true,
    });
    centerViewport();
  }

  function _useDrawingControls(): void {
    inputSettings.value = DRAWING_INPUT_SETTINGS;
    studio?.emitter.emit('world:update-layer', {
      kind: LayerKind.Block,
      opacity: 0.2,
      active: false,
    });
  }

  const submenu = computed({
    get: () => _submenu.value,
    set: (value) => {
      _submenu.value = value;

      switch (value) {
        case SubmenuKind.None:
          _useDefaultControls();
          break;
        case SubmenuKind.Crayon:
          _useDrawingControls();
          break;
        case SubmenuKind.Marker:
          _useDrawingControls();
          break;
        default:
          break;
      }
    },
  });

  async function destroyStudio(): Promise<void> {
    submenu.value = SubmenuKind.None;
    await studio?.destroy();
    studio = null;
  }

  const sortedLinkStyles = computed(() =>
    linkStyles.value.sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank))),
  );

  const expandedLinkStyleId = ref<string | null>(null);

  async function addLinkStyle(pageId: string): Promise<LinkStyle> {
    const PALETTE = ['#6a58f2', '#E52020', '#7ED4AD', '#FABC3F', '#FF8225'];
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];

    let next = LexoRank.middle();
    if (linkStyles.value.length > 0) {
      const last = linkStyles.value[linkStyles.value.length - 1];
      next = LexoRank.parse(last.rank).genNext();
    }

    const response = await $client.linkStyle.create.mutate({
      pageId,
      color,
      decoration: TextDecoration.None,
      hoverColor: color,
      hoverDecoration: TextDecoration.Underline,
      rank: next.toString(),
    });

    linkStyles.value.push(response);

    return response;
  }

  async function updateLinkStyle(linkStyle: LinkStyle): Promise<void> {
    const updated = await $client.linkStyle.update.mutate({
      id: linkStyle.id,
      updates: linkStyle,
    });

    linkStyles.value = linkStyles.value.map((s) => (s.id === updated.id ? updated : s));
  }

  async function removeLinkStyle(linkStyle: LinkStyle): Promise<void> {
    await $client.linkStyle.delete.mutate({ id: linkStyle.id });

    linkStyles.value = linkStyles.value.filter((s) => s.id !== linkStyle.id);
  }

  watch(
    inputSettings,
    () => {
      studio?.emitter.emit('world:update-input-settings', inputSettings.value);
    },
    { deep: true },
  );

  watch(
    brush,
    () => {
      studio?.emitter.emit('world:update-brush', brush.value);
    },
    { deep: true },
  );

  function reset(): void {
    inputSettings.value = defaultInputSettings;
    brush.value = defaultBrush;
    needsRecentering.value = false;
    saving.value = false;
    _submenu.value = SubmenuKind.None;
    prevStateBlobUrl.value = null;
    currStateBlobUrl.value = null;

    parts.value = [];
    groups.value = [];
    effects.value = [];
    tiles.value = [];
    linkStyles.value = [];

    hoveredParts.value = [];
    selectedParts.value = [];
    draggedParts.value = [];
    editedParts.value = [];
    typedParts.value = [];

    sideMenuKind.value = SideMenuKind.None;
  }

  return {
    studio,

    inputSettings,
    brush,
    needsRecentering,
    submenu,
    saving,
    parts,
    sortedParts,
    groups,
    effects,
    tiles,
    linkStyles,
    sortedLinkStyles,
    expandedLinkStyleId,
    hoveredParts,
    selectedParts,
    selectedPart,
    selectedGroup,
    draggedParts,
    editedParts,
    typedParts,
    sideMenuKind,

    nextTick,
    save,

    getPartById,
    initializeStudio,
    needsUpdate,
    updatePageInStudio,
    updatePartInStudio,
    updatePartInStudioNosnapshot,
    selectPart,
    deselectAll,
    createSnapshot,
    undo,
    redo,
    centerViewport,
    destroyStudio,
    getCurrentState,
    updateBrushColor,
    updateSiteLimits,
    startInnerEdit,
    cancelInnerEdit,
    finishInnerEdit,
    groupSelectedParts,
    ungroupSelectedParts,
    deleteSelectedParts,
    bringSelectedPartsForward,
    sendSelectedPartsBackward,
    duplicateSelectedParts,
    addEffect,
    updateEffect,
    updateEffectNoSnapshot,
    removeEffect,
    addLinkStyle,
    updateLinkStyle,
    removeLinkStyle,
    reset,
  };
});
