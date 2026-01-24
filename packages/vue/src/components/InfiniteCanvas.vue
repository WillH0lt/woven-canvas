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
  UserData,
  EventType,
  SINGLETON_ENTITY_ID,
  defineQuery,
  getResources,
  Held,
  type EntityId,
  type EditorOptionsInput,
  type EditorResources,
  type StoreAdapter,
  type BlockDefInput,
  type Keybind,
  type CursorDef,
  type AnyEditorComponentDef,
  type AnyEditorSingletonDef,
  type EditorSystem,
  type EditorPluginInput,
  type FontFamilyInput,
  type InferComponentType,
  type UserDataInput,
} from "@infinitecanvas/editor";
import {
  CanvasControlsPlugin,
  type CanvasControlsOptionsInput,
} from "@infinitecanvas/plugin-canvas-controls";
import { SelectionPlugin, Selected } from "@infinitecanvas/plugin-selection";
import { EraserPlugin } from "@infinitecanvas/plugin-eraser";
import { PenPlugin } from "@infinitecanvas/plugin-pen";
import { ArrowsPlugin } from "@infinitecanvas/plugin-arrows";

import {
  INFINITE_CANVAS_KEY,
  TOOLTIP_KEY,
  type InfiniteCanvasContext,
  type UserInfo,
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
import PenStrokeBlock from "./blocks/PenStroke.vue";
import ArcArrowBlock from "./blocks/ArcArrowBlock.vue";
import ElbowArrowBlock from "./blocks/ElbowArrowBlock.vue";
import ArrowHandle from "./blocks/ArrowHandle.vue";
import { BasicsPlugin } from "../BasicsPlugin";
import type { BlockData } from "../types";
import UserPresence from "./UserPresence.vue";

// Queries for tracking blocks and state components
const blockQuery = defineQuery((q) => q.tracking(Block));
const connectorQuery = defineQuery((q) => q.with(Block).tracking(Connector));
const selectedQuery = defineQuery((q) => q.with(Block).tracking(Selected));
const heldQuery = defineQuery((q) => q.with(Block).tracking(Held));
const hoveredQuery = defineQuery((q) => q.with(Block).tracking(Hovered));
const editedQuery = defineQuery((q) => q.with(Block).tracking(Edited));
const opacityQuery = defineQuery((q) => q.with(Block).tracking(Opacity));
const userQuery = defineQuery((q) => q.tracking(User));

type BlockDef = InferComponentType<typeof Block.schema>;

/**
 * InfiniteCanvas component props
 * Mirrors EditorOptionsInput with additional controls/selection customization
 */
export interface InfiniteCanvasProps {
  // Store adapter for persistence and sync
  store?: StoreAdapter;

  // Maximum number of entities (default: 10_000)
  maxEntities?: number;

  // User data for presence tracking (all fields optional, defaults applied)
  user?: UserDataInput;

  // Custom block definitions
  blockDefs?: BlockDefInput[];

  // Keybind definitions for keyboard shortcuts
  keybinds?: Keybind[];

  // Custom cursor definitions
  cursors?: Record<string, CursorDef>;

  // Custom components to register
  components?: AnyEditorComponentDef[];

  // Custom singletons to register
  singletons?: AnyEditorSingletonDef[];

  // Custom systems to register
  systems?: EditorSystem[];

  // Additional plugins (controls and selection are applied automatically)
  plugins?: EditorPluginInput[];

  // Controls plugin options
  controls?: CanvasControlsOptionsInput;

  // Custom fonts to load and make available in the font selector
  fonts?: FontFamilyInput[];
}

const props = withDefaults(defineProps<InfiniteCanvasProps>(), {
  maxEntities: 10_000,
  blockDefs: () => [],
  keybinds: () => [],
  cursors: () => ({}),
  components: () => [],
  singletons: () => [],
  systems: () => [],
  plugins: () => [],
  fonts: () => [],
});

const emit = defineEmits<{
  ready: [editor: Editor];
}>();

// Define slots - block slots use "block:<tag>" naming, floating-menu and toolbar slots have no props
defineSlots<
  {
    "floating-menu"?: () => any;
    toolbar?: () => any;
  } & {
    [slotName: `block:${string}`]: (props: BlockData) => any;
  }
>();

// Container ref for editor DOM element
const containerRef = ref<HTMLDivElement | null>(null);

// Editor instance
const editorRef = shallowRef<Editor | null>(null);

// Parse user data from props (userId and sessionId won't change)
const parsedUser = UserData.parse(props.user ?? {});

// Track which entities exist (for hasEntity check)
const entities = new Set<EntityId>();

// Track users by sessionId for selection highlighting
const usersBySessionId = new Map<string, UserInfo>();

// Users array for UserPresence component
const usersArray = shallowRef<UserInfo[]>([]);

// Component subscriptions - entityId -> componentName -> Set of callbacks
const componentSubscriptions = new Map<
  EntityId,
  Map<string, Set<(value: unknown) => void>>
>();

// Singleton subscriptions - singletonName -> Set of callbacks
const singletonSubscriptions = new Map<string, Set<(value: unknown) => void>>();

// Tick callbacks - called after each tick/processEvents
const tickCallbacks = new Set<() => void>();

// Block data for rendering - entityId -> reactive block data
const blockMap = new Map<EntityId, Ref<BlockData>>();

// Blocks sorted by rank for rendering
const sortedBlocks = shallowRef<Ref<BlockData>[]>([]);

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
  entityId: EntityId,
  componentDef: AnyEditorComponentDef,
  removed = false,
): void {
  const entitySubs = componentSubscriptions.get(entityId);
  if (!entitySubs) return;

  const callbacks = entitySubs.get(componentDef.name);
  if (!callbacks || callbacks.size === 0) return;

  let value: unknown = null;
  if (!removed) {
    const editor = editorRef.value;
    if (!editor) return;
    const ctx = editor._getContext();
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
function notifySingletonSubscribers(singletonDef: AnyEditorSingletonDef): void {
  const callbacks = singletonSubscriptions.get(singletonDef.name);
  if (!callbacks || callbacks.size === 0) return;

  const editor = editorRef.value;
  if (!editor) return;

  const ctx = editor._getContext();
  const value = singletonDef.snapshot(ctx);

  for (const callback of callbacks) {
    callback(value);
  }
}

// Register a callback to be called on each tick
function registerTickCallback(callback: () => void): () => void {
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
function getUserBySessionId(sessionId: string): UserInfo | null {
  return usersBySessionId.get(sessionId) ?? null;
}

// Provide context to composables
const canvasContext: InfiniteCanvasContext = {
  hasEntity: (entityId: EntityId) => entities.has(entityId),
  getEditor: () => editorRef.value,
  getSessionId,
  getUserBySessionId,
  subscribeComponent,
  subscribeSingleton,
  registerTickCallback,
};
provide(INFINITE_CANVAS_KEY, canvasContext);

// Provide container ref for FloatingMenu positioning
provide("containerRef", containerRef);

// Provide tooltip context for per-instance tooltip state
const tooltipContext = createTooltipContext();
provide(TOOLTIP_KEY, tooltipContext);

let eventIndex = 0;
let animationFrameId: number | null = null;

async function tick() {
  if (!editorRef.value) return;
  await editorRef.value.tick();

  processEvents(editorRef.value);
  updateBlocks(editorRef.value);

  // Call registered tick callbacks (e.g., for useQuery)
  for (const callback of tickCallbacks) {
    callback();
  }

  animationFrameId = requestAnimationFrame(tick);
}

onMounted(async () => {
  if (!containerRef.value) return;

  // Build plugins array with built-in plugins
  const allPlugins: EditorPluginInput[] = [];

  // Add controls plugin unless disabled
  allPlugins.push(CanvasControlsPlugin(props.controls ?? {}));
  allPlugins.push(SelectionPlugin);
  allPlugins.push(EraserPlugin);
  allPlugins.push(PenPlugin);
  allPlugins.push(ArrowsPlugin);

  allPlugins.push(BasicsPlugin);

  // Add user-provided plugins
  allPlugins.push(...props.plugins);

  // Create editor options from props
  const editorOptions: EditorOptionsInput = {
    store: props.store,
    maxEntities: props.maxEntities,
    user: parsedUser,
    blockDefs: props.blockDefs,
    keybinds: props.keybinds,
    cursors: props.cursors,
    components: props.components,
    singletons: props.singletons,
    systems: props.systems,
    plugins: allPlugins,
    fonts: props.fonts,
  };

  // Create and initialize editor
  const editor = new Editor(containerRef.value, editorOptions);
  await editor.initialize();

  editorRef.value = editor;

  // Start the render loop
  animationFrameId = requestAnimationFrame(tick);

  // Emit ready event with editor instance
  emit("ready", editor);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  editorRef.value?.dispose();
});

/**
 * Process ECS events and update reactive state.
 */
function processEvents(editor: Editor) {
  const ctx = editor._getContext();
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
          notifySingletonSubscribers(singletonDef);
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
        notifySubscribers(entityId, componentDef);
      }
    } else if (eventType === EventType.COMPONENT_REMOVED) {
      const componentDef = componentsById.get(componentId);
      if (componentDef) {
        notifySubscribers(entityId, componentDef, true);
      }
    } else if (eventType === EventType.CHANGED) {
      const componentDef = componentsById.get(componentId);
      if (componentDef) {
        notifySubscribers(entityId, componentDef);
      }
    }
  }
}

/**
 * Update block state using ECS queries and rebuild sorted array if needed.
 */
function updateBlocks(editor: Editor) {
  let needsResort = false;

  const ctx = editor._getContext();

  // Handle block additions
  for (const entityId of blockQuery.added(ctx)) {
    const snapshot = Block.snapshot(ctx, entityId);
    blockMap.set(
      entityId,
      ref({
        entityId,
        block: snapshot,
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
  for (const entityId of userQuery.added(ctx)) {
    const userSnapshot = User.snapshot(ctx, entityId);
    usersBySessionId.set(userSnapshot.sessionId, {
      sessionId: userSnapshot.sessionId,
      color: userSnapshot.color,
      name: userSnapshot.name,
    });
    usersChanged = true;
  }
  for (const entityId of userQuery.changed(ctx)) {
    const userSnapshot = User.snapshot(ctx, entityId);
    usersBySessionId.set(userSnapshot.sessionId, {
      sessionId: userSnapshot.sessionId,
      color: userSnapshot.color,
      name: userSnapshot.name,
    });
    usersChanged = true;
  }
  if (userQuery.removed(ctx).length > 0) {
    // Remove user from map - we need to find the sessionId by iterating
    // Since the entity is removed, we can't snapshot it, but we track by entityId
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
  for (const entityId of heldQuery.added(ctx)) {
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
  for (const entityId of heldQuery.changed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      blockRef.value.held = Held.snapshot(ctx, entityId);
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
  for (const entityId of opacityQuery.added(ctx)) {
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
  for (const entityId of opacityQuery.changed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      blockRef.value.opacity = Opacity.snapshot(ctx, entityId);
    }
  }

  // Update connector state
  for (const entityId of connectorQuery.added(ctx)) {
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
  for (const entityId of connectorQuery.changed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      blockRef.value.connector = Connector.snapshot(ctx, entityId);
    }
  }

  // Rebuild sorted array only when blocks added/removed or rank changed
  if (needsResort) {
    const blocks = Array.from(blockMap.values());

    blocks.sort((a, b) => {
      // const aRank = getEffectiveRank(a.value.entityId, a.value.block.rank);
      // const bRank = getEffectiveRank(b.value.entityId, b.value.block.rank);
      return a.value.block.rank > b.value.block.rank ? 1 : -1;
    });

    sortedBlocks.value = blocks;
  }
}

// Camera ref for internal rendering - updated via subscription
const cameraRef = shallowRef(Camera.default());

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
  const { block, opacity } = data;
  const heldByColor = getHeldByColor(data);

  return {
    position: "absolute" as const,
    left: `${block.position[0]}px`,
    top: `${block.position[1]}px`,
    width: `${block.size[0]}px`,
    height: `${block.size[1]}px`,
    transform: getBlockTransform(block),
    opacity: opacity !== null ? opacity.value / 255 : undefined,
    pointerEvents: "none" as const,
    userSelect: "none" as const,
    "--ic-held-by-color": heldByColor ?? undefined,
  };
}
</script>

<template>
  <div
    ref="containerRef"
    class="ic-root"
    :style="{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }"
  >
    <div
      class="ic-canvas"
      :style="{
        position: 'absolute',
        transformOrigin: '0 0',
        transform: `scale(${cameraRef.zoom}) translate(${-cameraRef.left}px, ${-cameraRef.top}px)`,
        '--ic-zoom': cameraRef.zoom,
      }"
    >
      <div
        v-for="blockData in sortedBlocks"
        :key="blockData.value.entityId"
        :style="getBlockStyle(blockData.value)"
        :data-selected="blockData.value.selected || undefined"
        :data-held-by-other="
          getHeldByColor(blockData.value) !== null || undefined
        "
        :data-hovered="blockData.value.hovered || undefined"
        class="ic-block"
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
          <StickyNote
            v-else-if="blockData.value.block.tag === 'sticky-note'"
            v-bind="blockData.value"
          />
          <Eraser
            v-else-if="blockData.value.block.tag === 'eraser'"
            v-bind="blockData.value"
          />
          <PenStrokeBlock
            v-else-if="blockData.value.block.tag === 'pen-stroke'"
            v-bind="blockData.value"
          />
          <ArcArrowBlock
            v-else-if="blockData.value.block.tag === 'arc-arrow'"
            v-bind="blockData.value"
          />
          <ElbowArrowBlock
            v-else-if="blockData.value.block.tag === 'elbow-arrow'"
            v-bind="blockData.value"
          />
          <TextBlock
            v-else-if="blockData.value.block.tag === 'text'"
            v-bind="blockData.value"
          />
        </slot>
      </div>
    </div>

    <!-- Floating menu -->
    <FloatingMenu v-if="editorRef">
      <template #default="menuProps">
        <slot name="floating-menu" v-bind="menuProps" />
      </template>
    </FloatingMenu>

    <!-- User presence -->
    <UserPresence v-if="editorRef" :users="usersArray" />

    <!-- Toolbar -->
    <slot name="toolbar">
      <div class="ic-toolbar">
        <Toolbar />
      </div>
    </slot>
  </div>
</template>

<style>
.ic-toolbar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}
</style>
