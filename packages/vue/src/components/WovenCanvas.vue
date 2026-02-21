<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  shallowRef,
  provide,
  type Ref,
} from "vue";
import {
  Editor,
  Camera,
  Block,
  Connector,
  Hovered,
  Edited,
  Opacity,
  User,
  type ControlsOptionsInput,
  UserData as UserDataZod,
  EventType,
  SINGLETON_ENTITY_ID,
  STRATUM_ORDER,
  defineQuery,
  getResources,
  Held,
  type EntityId,
  type EditorOptionsInput,
  type EditorResources,
  type AnyCanvasComponentDef,
  type AnyCanvasSingletonDef,
  type EditorPluginInput,
  type InferCanvasComponentType,
  type Context,
} from "@woven-canvas/core";
import { CanvasStore, type CanvasStoreOptions } from "@woven-ecs/canvas-store";
import {
  AssetManager,
  LocalAssetProvider,
  type AssetProvider,
} from "@woven-canvas/asset-sync";
import {
  CanvasControlsPlugin,
  type CanvasControlsOptionsInput,
} from "@woven-canvas/plugin-canvas-controls";
import {
  createSelectionPlugin,
  Selected,
  type SelectionPluginOptionsInput,
} from "@woven-canvas/plugin-selection";
import {
  createEraserPlugin,
  type EraserPluginOptions,
} from "@woven-canvas/plugin-eraser";
import { createPenPlugin } from "@woven-canvas/plugin-pen";
import {
  createArrowsPlugin,
  type ArrowsPluginOptions,
} from "@woven-canvas/plugin-arrows";

import {
  WOVEN_CANVAS_KEY,
  TOOLTIP_KEY,
  type WovenCanvasContext,
  type UserData,
} from "../injection";
import { createTooltipContext } from "../composables/useTooltipSingleton";
import SelectionBox from "./blocks/SelectionBox.vue";
import TransformBox from "./blocks/TransformBox.vue";
import TransformHandle from "./blocks/TransformHandle.vue";
import StickyNote from "./blocks/StickyNote.vue";
import TextBlock from "./blocks/TextBlock.vue";
import FloatingMenu from "./FloatingMenu.vue";
import Toolbar from "./Toolbar.vue";
import Eraser from "./blocks/Eraser.vue";
import PenStroke from "./blocks/PenStroke.vue";
import ArcArrow from "./blocks/ArcArrow.vue";
import ElbowArrow from "./blocks/ElbowArrow.vue";
import ArrowHandle from "./blocks/ArrowHandle.vue";
import ArrowTerminal from "./blocks/ArrowTerminal.vue";
import ImageBlock from "./blocks/ImageBlock.vue";
import ShapeBlock from "./blocks/ShapeBlock.vue";
import { EditingPlugin } from "../EditingPlugin";
import type { BlockData, BackgroundOptions } from "../types";
import UserPresence from "./UserPresence.vue";
import UserCursors from "./UserCursors.vue";
import OfflineIndicator from "./OfflineIndicator.vue";
import VersionMismatch from "./VersionMismatch.vue";
import CanvasBackground from "./CanvasBackground.vue";
import BackToContentButton from "./BackToContentButton.vue";
import LoadingOverlay from "./LoadingOverlay.vue";

// Queries for tracking blocks and state components
const blockQuery = defineQuery((q) => q.tracking(Block));
const connectorQuery = defineQuery((q) => q.with(Block).tracking(Connector));
const selectedQuery = defineQuery((q) => q.with(Block).tracking(Selected));
const heldQuery = defineQuery((q) => q.with(Block).tracking(Held));
const hoveredQuery = defineQuery((q) => q.with(Block).tracking(Hovered));
const editedQuery = defineQuery((q) => q.with(Block).tracking(Edited));
const opacityQuery = defineQuery((q) => q.with(Block).tracking(Opacity));
const userQuery = defineQuery((q) => q.tracking(User));

type BlockDef = InferCanvasComponentType<typeof Block.schema>;

/**
 * WovenCanvas component props
 */
export interface WovenCanvasProps {
  // Store options for persistence, history, and multiplayer
  store?: CanvasStoreOptions;

  // Editor options (passed through to Editor constructor)
  editor?: EditorOptionsInput;

  // Background options (grid, dots, or none)
  background?: BackgroundOptions;

  // Asset provider for image uploads (defaults to LocalAssetProvider)
  assetProvider?: AssetProvider;

  // Options for built-in plugins (pass false to disable a plugin)
  pluginOptions?: {
    controls?: CanvasControlsOptionsInput | false;
    selection?: SelectionPluginOptionsInput | false;
    eraser?: EraserPluginOptions | false;
    pen?: false;
    arrows?: ArrowsPluginOptions | false;
  };

  // Initial controls configuration (tool mappings for mouse buttons, wheel, etc.)
  controls?: ControlsOptionsInput;
}

const props = defineProps<WovenCanvasProps>();

const emit = defineEmits<{
  ready: [editor: Editor, store: CanvasStore];
}>();

// Define slots - block slots use "block:<tag>" naming, other slots allow overriding built-in UI
defineSlots<
  {
    default?: () => any;
    loading?: (props: { isLoading: boolean }) => any;
    background?: (props: { background: BackgroundOptions }) => any;
    "floating-menu"?: () => any;
    toolbar?: () => any;
    "user-cursors"?: (props: {
      users: UserData[];
      currentSessionId: string;
      camera: { left: number; top: number; zoom: number };
    }) => any;
    "user-presence"?: (props: { users: UserData[] }) => any;
    "offline-indicator"?: (props: { isOnline: boolean }) => any;
    "version-mismatch"?: (props: { versionMismatch: boolean }) => any;
    "back-to-content"?: () => any;
  } & {
    [slotName: `block:${string}`]: (props: BlockData) => any;
  }
>();

// Container ref for editor DOM element
const containerRef = ref<HTMLDivElement | null>(null);

// Editor instance
const editorRef = shallowRef<Editor | null>(null);

// Parse user data from props (userId and sessionId won't change)
const parsedUser = UserDataZod.parse(props.editor?.user ?? {});

// Track which entities exist (for hasEntity check)
const entities = new Set<EntityId>();

// Track users by sessionId for selection highlighting
const usersBySessionId = new Map<string, UserData>();

// Users array for UserPresence component
const usersArray = shallowRef<UserData[]>([]);

// Component subscriptions - entityId -> componentName -> Set of callbacks
const componentSubscriptions = new Map<
  EntityId,
  Map<string, Set<(value: unknown) => void>>
>();

// Singleton subscriptions - singletonName -> Set of callbacks
const singletonSubscriptions = new Map<string, Set<(value: unknown) => void>>();

// Tick callbacks - called after each tick/processEvents
const tickCallbacks = new Set<(ctx: Context) => void>();

// Block data for rendering - entityId -> reactive block data
const blockMap = new Map<EntityId, Ref<BlockData>>();

// Blocks sorted by rank for rendering
const sortedBlocks = shallowRef<Ref<BlockData>[]>([]);

// Online status - updated each tick from the store
const isOnline = ref(true);

// Version mismatch - set when server reports incompatible protocol version
const versionMismatch = ref(false);

// Loading state - shown until editor is initialized and first tick completes
const isLoading = ref(true);

// Camera ref for internal rendering - updated via subscription
const cameraRef = shallowRef(Camera.default());

// Subscribe to component changes for an entity
function subscribeComponent(
  entityId: EntityId,
  componentName: string,
  callback: (value: unknown) => void,
): () => void {
  let entitySubs = componentSubscriptions.get(entityId);
  if (!entitySubs) {
    entitySubs = new Map();
    componentSubscriptions.set(entityId, entitySubs);
  }

  let callbacks = entitySubs.get(componentName);
  if (!callbacks) {
    callbacks = new Set();
    entitySubs.set(componentName, callbacks);
  }

  callbacks.add(callback);

  // Return unsubscribe function
  return () => {
    callbacks!.delete(callback);
    if (callbacks!.size === 0) {
      entitySubs!.delete(componentName);
      if (entitySubs!.size === 0) {
        componentSubscriptions.delete(entityId);
      }
    }
  };
}

// Notify subscribers of a component change (or removal when removed=true)
function notifySubscribers(
  ctx: Context,
  entityId: EntityId,
  componentDef: AnyCanvasComponentDef,
  removed = false,
): void {
  const entitySubs = componentSubscriptions.get(entityId);
  if (!entitySubs) return;

  const callbacks = entitySubs.get(componentDef.name);
  if (!callbacks || callbacks.size === 0) return;

  let value: unknown = null;
  if (!removed) {
    value = componentDef.snapshot(ctx, entityId);
  }

  for (const callback of callbacks) {
    callback(value);
  }
}

// Subscribe to singleton changes
function subscribeSingleton(
  singletonName: string,
  callback: (value: unknown) => void,
): () => void {
  let callbacks = singletonSubscriptions.get(singletonName);
  if (!callbacks) {
    callbacks = new Set();
    singletonSubscriptions.set(singletonName, callbacks);
  }

  callbacks.add(callback);

  // Return unsubscribe function
  return () => {
    callbacks!.delete(callback);
    if (callbacks!.size === 0) {
      singletonSubscriptions.delete(singletonName);
    }
  };
}

// Notify singleton subscribers
function notifySingletonSubscribers(
  ctx: Context,
  singletonDef: AnyCanvasSingletonDef,
): void {
  const callbacks = singletonSubscriptions.get(singletonDef.name);
  if (!callbacks || callbacks.size === 0) return;

  const value = singletonDef.snapshot(ctx);

  for (const callback of callbacks) {
    callback(value);
  }
}

// Register a callback to be called on each tick
function registerTickCallback(callback: (ctx: Context) => void): () => void {
  tickCallbacks.add(callback);

  // Return unregister function
  return () => {
    tickCallbacks.delete(callback);
  };
}

// Get current user's sessionId (parsed from props, won't change)
function getSessionId(): string {
  return parsedUser.sessionId;
}

// Get user info by session ID
function getUserBySessionId(sessionId: string): UserData | null {
  return usersBySessionId.get(sessionId) ?? null;
}

// Provide context to composables
const canvasContext: WovenCanvasContext = {
  hasEntity: (entityId: EntityId) => entities.has(entityId),
  getEditor: () => editorRef.value,
  getAssetManager: () => assetManager,
  getSessionId,
  getUserBySessionId,
  subscribeComponent,
  subscribeSingleton,
  registerTickCallback,
};
provide(WOVEN_CANVAS_KEY, canvasContext);

// Provide container ref for FloatingMenu positioning
provide("containerRef", containerRef);

// Provide tooltip context for per-instance tooltip state
const tooltipContext = createTooltipContext();
provide(TOOLTIP_KEY, tooltipContext);

let eventIndex = 0;
let animationFrameId: number | null = null;
let store: CanvasStore | null = null;
let assetManager: AssetManager | null = null;

async function tick() {
  if (!editorRef.value || !store) return;

  editorRef.value.nextTick((ctx) => {
    processEvents(ctx);
    updateBlocks(ctx);

    // Call registered tick callbacks (e.g., for useQuery)
    for (const callback of tickCallbacks) {
      callback(ctx);
    }

    if (store) {
      store.sync(ctx);
    }
  });

  await editorRef.value.tick();

  animationFrameId = requestAnimationFrame(tick);
}

onMounted(async () => {
  if (!containerRef.value) return;

  // Create store (adapters are built lazily in initialize)
  const syncOpts = props.store ?? {};

  // Build store options, wrapping callbacks to track internal state
  const storeOptions: CanvasStoreOptions = {
    ...syncOpts,
  };

  // If websocket is configured, wrap the callbacks
  if (syncOpts.websocket) {
    storeOptions.websocket = {
      ...syncOpts.websocket,
      onVersionMismatch: (serverProtocolVersion) => {
        versionMismatch.value = true;
        syncOpts.websocket?.onVersionMismatch?.(serverProtocolVersion);
      },
      onConnectivityChange: (online) => {
        isOnline.value = online;
        syncOpts.websocket?.onConnectivityChange?.(online);
      },
    };
  }

  store = new CanvasStore(storeOptions);

  // Build plugins array with built-in plugins (skip if explicitly disabled with false)
  const allPlugins: EditorPluginInput[] = [];
  const opts = props.pluginOptions;

  if (opts?.controls !== false) {
    allPlugins.push(CanvasControlsPlugin(opts?.controls ?? {}));
  }
  if (opts?.selection !== false) {
    allPlugins.push(createSelectionPlugin(opts?.selection || undefined));
  }
  if (opts?.eraser !== false) {
    allPlugins.push(createEraserPlugin(opts?.eraser || undefined));
  }
  if (opts?.pen !== false) {
    allPlugins.push(createPenPlugin());
  }
  if (opts?.arrows !== false) {
    allPlugins.push(createArrowsPlugin(opts?.arrows || undefined));
  }
  allPlugins.push(EditingPlugin({ store }));

  // Add user-provided plugins from editorOptions
  if (props.editor?.plugins) {
    allPlugins.push(...props.editor.plugins);
  }

  // Create editor (collects all components/singletons from plugins)
  const editorOptions: EditorOptionsInput = {
    ...props.editor,
    user: parsedUser,
    plugins: allPlugins,
    controls: props.controls,
  };

  const editor = new Editor(containerRef.value, editorOptions);
  await editor.initialize();

  // Initialize store with the editor's collected components/singletons
  await store.initialize({
    components: editor.components,
    singletons: editor.singletons,
  });

  // Initialize asset manager
  const documentId = syncOpts.persistence?.documentId ?? "default";
  assetManager = new AssetManager({
    provider: props.assetProvider ?? new LocalAssetProvider(),
    documentId,
  });
  await assetManager.init();
  await assetManager.resumePendingUploads();

  editorRef.value = editor;

  // Start the render loop
  animationFrameId = requestAnimationFrame(tick);

  // Loading complete
  isLoading.value = false;

  // Emit ready event with editor instance
  emit("ready", editor, store);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  assetManager?.close();
  store?.close();
  editorRef.value?.dispose();
});

/**
 * Process ECS events and update reactive state.
 */
function processEvents(ctx: Context) {
  const { events, newIndex } = ctx.eventBuffer.readEvents(eventIndex);
  eventIndex = newIndex;

  if (events.length === 0) return;

  const { componentsById, singletonsById } = getResources<EditorResources>(ctx);

  for (const { entityId, eventType, componentId } of events) {
    // Handle singleton events (special entity ID)
    if (entityId === SINGLETON_ENTITY_ID) {
      if (eventType === EventType.CHANGED) {
        const singletonDef = singletonsById.get(componentId);
        if (singletonDef) {
          notifySingletonSubscribers(ctx, singletonDef);
        }
      }
      continue;
    }

    if (eventType === EventType.ADDED) {
      // Track entity existence
      entities.add(entityId);
    } else if (eventType === EventType.REMOVED) {
      // Entity removed
      entities.delete(entityId);
      componentSubscriptions.delete(entityId);
    } else if (eventType === EventType.COMPONENT_ADDED) {
      // Ensure entity is tracked
      entities.add(entityId);

      const componentDef = componentsById.get(componentId);
      if (componentDef) {
        notifySubscribers(ctx, entityId, componentDef);
      }
    } else if (eventType === EventType.COMPONENT_REMOVED) {
      const componentDef = componentsById.get(componentId);
      if (componentDef) {
        notifySubscribers(ctx, entityId, componentDef, true);
      }
    } else if (eventType === EventType.CHANGED) {
      const componentDef = componentsById.get(componentId);
      if (componentDef) {
        notifySubscribers(ctx, entityId, componentDef);
      }
    }
  }
}

/**
 * Update block state using ECS queries and rebuild sorted array if needed.
 */
function updateBlocks(ctx: Context) {
  let needsResort = false;

  // Handle block additions
  for (const entityId of blockQuery.added(ctx)) {
    const snapshot = Block.snapshot(ctx, entityId);
    const blockDef = editorRef.value?.blockDefs[snapshot.tag];
    const stratum = blockDef?.stratum ?? "content";
    blockMap.set(
      entityId,
      ref({
        entityId,
        block: snapshot,
        stratum,
        selected: false,
        held: null,
        hovered: false,
        edited: false,
        opacity: null,
        connector: null,
      }),
    );
    needsResort = true;
  }

  // Handle block removals
  for (const entityId of blockQuery.removed(ctx)) {
    blockMap.delete(entityId);
    needsResort = true;
  }

  // Handle block changes (position, size, rank, etc.)
  for (const entityId of blockQuery.changed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      const snapshot = Block.snapshot(ctx, entityId);
      if (blockRef.value.block.rank !== snapshot.rank) {
        needsResort = true;
      }
      blockRef.value.block = snapshot;
    }
  }

  // Update users map for selection color lookup
  let usersChanged = false;
  for (const entityId of userQuery.addedOrChanged(ctx)) {
    const userSnapshot = User.snapshot(ctx, entityId);
    usersBySessionId.set(userSnapshot.sessionId, userSnapshot);
    usersChanged = true;
  }
  for (const entityId of userQuery.removed(ctx)) {
    const user = User.read(ctx, entityId);
    usersBySessionId.delete(user.sessionId);
    usersChanged = true;
  }
  if (usersChanged) {
    usersArray.value = Array.from(usersBySessionId.values());
  }

  // Update selected state (boolean - Selected is an empty component)
  for (const entityId of selectedQuery.added(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && !blockRef.value.selected) {
      blockRef.value.selected = true;
    }
  }
  for (const entityId of selectedQuery.removed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && blockRef.value.selected) {
      blockRef.value.selected = false;
    }
  }

  // Update held state (for remote user presence)
  for (const entityId of heldQuery.addedOrChanged(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      blockRef.value.held = Held.snapshot(ctx, entityId);
    }
  }
  for (const entityId of heldQuery.removed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && blockRef.value.held !== null) {
      blockRef.value.held = null;
    }
  }

  // Update hovered state
  for (const entityId of hoveredQuery.added(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && !blockRef.value.hovered) {
      blockRef.value.hovered = true;
    }
  }
  for (const entityId of hoveredQuery.removed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && blockRef.value.hovered) {
      blockRef.value.hovered = false;
    }
  }

  // Update edited state
  for (const entityId of editedQuery.added(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && !blockRef.value.edited) {
      blockRef.value.edited = true;
    }
  }
  for (const entityId of editedQuery.removed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && blockRef.value.edited) {
      blockRef.value.edited = false;
    }
  }

  // Update opacity state
  for (const entityId of opacityQuery.addedOrChanged(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      blockRef.value.opacity = Opacity.snapshot(ctx, entityId);
    }
  }
  for (const entityId of opacityQuery.removed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && blockRef.value.opacity !== null) {
      blockRef.value.opacity = null;
    }
  }

  // Update connector state
  for (const entityId of connectorQuery.addedOrChanged(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      blockRef.value.connector = Connector.snapshot(ctx, entityId);
    }
  }
  for (const entityId of connectorQuery.removed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && blockRef.value.connector !== null) {
      blockRef.value.connector = null;
    }
  }

  // Rebuild sorted array only when blocks added/removed or rank changed
  if (needsResort) {
    const blocks = Array.from(blockMap.values());

    blocks.sort((a, b) => (a.value.block.rank > b.value.block.rank ? 1 : -1));

    sortedBlocks.value = blocks;
  }
}

// Subscribe to Camera singleton for internal rendering
subscribeSingleton(Camera.name, (value) => {
  if (value) {
    cameraRef.value = value as typeof cameraRef.value;
  }
});

function getBlockTransform(block: BlockDef): string | undefined {
  const hasRotation = block.rotateZ !== 0;
  const hasFlipX = block.flip[0];
  const hasFlipY = block.flip[1];

  if (!hasRotation && !hasFlipX && !hasFlipY) {
    return undefined;
  }

  const parts: string[] = [];
  if (hasRotation) parts.push(`rotate(${block.rotateZ}rad)`);
  if (hasFlipX) parts.push("scaleX(-1)");
  if (hasFlipY) parts.push("scaleY(-1)");

  return parts.join(" ");
}

function getHeldByColor(data: BlockData): string | null {
  const { held } = data;
  if (!held || !held.sessionId) return null;
  if (held.sessionId === parsedUser.sessionId) return null;
  const otherUser = getUserBySessionId(held.sessionId);
  return otherUser?.color ?? null;
}

function getBlockStyle(data: BlockData) {
  const { block, stratum, opacity } = data;
  const heldByColor = getHeldByColor(data);
  const opacityValue = opacity !== null ? opacity.value / 255 : 1;

  return {
    position: "absolute" as const,
    left: `${block.position[0]}px`,
    top: `${block.position[1]}px`,
    width: `${block.size[0]}px`,
    height: `${block.size[1]}px`,
    zIndex: STRATUM_ORDER[stratum] * 1000,
    transform: getBlockTransform(block),
    opacity: opacityValue,
    pointerEvents: "none" as const,
    userSelect: "none" as const,
    "--wov-held-by-color": heldByColor ?? undefined,
    // Delay fade-in (0→1) to allow dimensions to settle, but hide immediately (1→0)
    transition: opacityValue === 1 ? "opacity 0ms 32ms" : undefined,
  };
}
</script>

<template>
  <div
    ref="containerRef"
    class="wov-root"
    :style="{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }"
  >
    <!-- Background layer -->
    <slot v-if="background" name="background" :background="background">
      <CanvasBackground :background="background" />
    </slot>

    <div
      class="wov-canvas"
      :style="{
        position: 'absolute',
        transformOrigin: '0 0',
        transform: `scale(${cameraRef.zoom}) translate(${-cameraRef.left}px, ${-cameraRef.top}px)`,
        '--wov-zoom': cameraRef.zoom,
      }"
    >
      <div
        v-for="blockData in sortedBlocks"
        :key="blockData.value.entityId"
        :data-entity-id="blockData.value.entityId"
        :style="getBlockStyle(blockData.value)"
        :data-selected="blockData.value.selected || undefined"
        :data-held-by-other="
          getHeldByColor(blockData.value) !== null || undefined
        "
        :data-hovered="blockData.value.hovered || undefined"
        class="wov-block"
      >
        <slot
          :name="`block:${blockData.value.block.tag}`"
          v-bind="blockData.value"
        >
          <!-- Default blocks -->
          <SelectionBox
            v-if="blockData.value.block.tag === 'selection-box'"
            v-bind="blockData.value"
          />
          <TransformBox
            v-else-if="blockData.value.block.tag === 'transform-box'"
            v-bind="blockData.value"
          />
          <TransformHandle
            v-else-if="blockData.value.block.tag === 'transform-handle'"
            v-bind="blockData.value"
          />
          <ArrowHandle
            v-else-if="blockData.value.block.tag === 'arrow-handle'"
            v-bind="blockData.value"
          />
          <ArrowTerminal
            v-else-if="blockData.value.block.tag === 'arrow-terminal'"
            v-bind="blockData.value"
          />
          <StickyNote
            v-else-if="blockData.value.block.tag === 'sticky-note'"
            v-bind="blockData.value"
          />
          <Eraser
            v-else-if="blockData.value.block.tag === 'eraser'"
            v-bind="blockData.value"
          />
          <PenStroke
            v-else-if="blockData.value.block.tag === 'pen-stroke'"
            v-bind="blockData.value"
          />
          <ArcArrow
            v-else-if="blockData.value.block.tag === 'arc-arrow'"
            v-bind="blockData.value"
          />
          <ElbowArrow
            v-else-if="blockData.value.block.tag === 'elbow-arrow'"
            v-bind="blockData.value"
          />
          <TextBlock
            v-else-if="blockData.value.block.tag === 'text'"
            v-bind="blockData.value"
          />
          <ImageBlock
            v-else-if="blockData.value.block.tag === 'image'"
            v-bind="blockData.value"
          />
          <ShapeBlock
            v-else-if="blockData.value.block.tag === 'shape'"
            v-bind="blockData.value"
          />
        </slot>
      </div>
    </div>

    <!-- User cursors layer -->
    <slot
      v-if="editorRef"
      name="user-cursors"
      :users="usersArray"
      :current-session-id="parsedUser.sessionId"
      :camera="cameraRef"
    >
      <UserCursors
        :users="usersArray"
        :current-session-id="parsedUser.sessionId"
        :camera="cameraRef"
      />
    </slot>

    <!-- Floating menu -->
    <FloatingMenu v-if="editorRef">
      <template #default="menuProps">
        <slot name="floating-menu" v-bind="menuProps" />
      </template>
    </FloatingMenu>

    <!-- User presence -->
    <slot v-if="editorRef" name="user-presence" :users="usersArray">
      <UserPresence :users="usersArray" />
    </slot>

    <!-- Toolbar (wait for editor so Controls has correct initial values) -->
    <slot v-if="editorRef" name="toolbar">
      <Toolbar />
    </slot>

    <!-- Default slot for custom UI overlays -->
    <slot v-if="editorRef" />

    <!-- Offline indicator -->
    <slot name="offline-indicator" :is-online="isOnline">
      <OfflineIndicator :is-online="isOnline" />
    </slot>

    <!-- Version mismatch overlay -->
    <slot name="version-mismatch" :version-mismatch="versionMismatch">
      <VersionMismatch :version-mismatch="versionMismatch" />
    </slot>

    <!-- Back to content button -->
    <slot name="back-to-content">
      <BackToContentButton />
    </slot>

    <!-- Loading overlay -->
    <slot name="loading" :is-loading="isLoading">
      <LoadingOverlay :is-loading="isLoading" />
    </slot>
  </div>
</template>

<style>
/* Shared menu button styles */
.wov-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 4px;
  padding: 0 8px;
}

.wov-menu-dropdown {
  display: flex;
  background-color: var(--wov-gray-700);
  border-radius: var(--wov-menu-border-radius);
  overflow: hidden;
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
}

.wov-menu-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--wov-gray-100);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.wov-menu-option:hover {
  background-color: var(--wov-gray-600);
}

.wov-menu-option.is-active {
  background-color: var(--wov-primary);
}
</style>
