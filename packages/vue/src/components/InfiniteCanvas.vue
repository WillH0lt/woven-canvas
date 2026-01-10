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
  Hovered,
  Edited,
  Opacity,
  EventType,
  SINGLETON_ENTITY_ID,
  defineQuery,
  getResources,
  type EntityId,
  type InferComponentType,
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
} from "@infinitecanvas/editor";
import { CanvasControlsPlugin } from "@infinitecanvas/plugin-canvas-controls";
import { SelectionPlugin, Selected } from "@infinitecanvas/plugin-selection";
import { EraserPlugin } from "@infinitecanvas/plugin-eraser";
import { ArrowsPlugin } from "@infinitecanvas/plugin-arrows";
import { INFINITE_CANVAS_KEY, type InfiniteCanvasContext } from "../injection";
import SelectionBox from "./blocks/SelectionBox.vue";
import TransformBox from "./blocks/TransformBox.vue";
import TransformHandle from "./blocks/TransformHandle.vue";
import StickyNote from "./blocks/StickyNote.vue";
import FloatingMenu from "./FloatingMenu.vue";
import Toolbar from "./Toolbar.vue";
import Eraser from "./blocks/Eraser.vue";
import ArcArrowBlock from "./blocks/ArcArrowBlock.vue";
import ElbowArrowBlock from "./blocks/ElbowArrowBlock.vue";
import ArrowHandle from "./blocks/ArrowHandle.vue";
import { BasicsPlugin } from "../BasicsPlugin";

type BlockComponentData = InferComponentType<typeof Block.schema>;
type SelectedComponentData = InferComponentType<typeof Selected.schema>;
type OpacityComponentData = InferComponentType<typeof Opacity.schema>;

// Extended block data with state for rendering
interface BlockData {
  entityId: EntityId;
  block: BlockComponentData;
  selected: SelectedComponentData | null;
  hovered: boolean;
  edited: boolean;
  opacity: OpacityComponentData | null;
}

// Queries for tracking blocks and state components
const blockQuery = defineQuery((q) => q.tracking(Block));
const selectedQuery = defineQuery((q) => q.with(Block).tracking(Selected));
const hoveredQuery = defineQuery((q) => q.with(Block).tracking(Hovered));
const editedQuery = defineQuery((q) => q.with(Block).tracking(Edited));
const opacityQuery = defineQuery((q) => q.with(Block).tracking(Opacity));

/**
 * Controls plugin options exposed as props
 */
export interface ControlsOptions {
  /** Minimum zoom level (default: 0.05 = 5%) */
  minZoom?: number;
  /** Maximum zoom level (default: 4 = 400%) */
  maxZoom?: number;
}

/**
 * InfiniteCanvas component props
 * Mirrors EditorOptionsInput with additional controls/selection customization
 */
export interface InfiniteCanvasProps {
  // Store adapter for persistence and sync
  store?: StoreAdapter;

  // Maximum number of entities (default: 10_000)
  maxEntities?: number;

  // User ID for presence tracking
  userId?: string;

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
  controls?: ControlsOptions;
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
  disableControls: false,
  disableSelection: false,
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
    [slotName: `block:${string}`]: (props: { entityId: EntityId }) => any;
  }
>();

// Container ref for editor DOM element
const containerRef = ref<HTMLDivElement | null>(null);

// Editor instance
const editorRef = shallowRef<Editor | null>(null);

// Track which entities exist (for hasEntity check)
const entities = new Set<EntityId>();

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
  callback: (value: unknown) => void
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
  removed = false
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
  callback: (value: unknown) => void
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

// Provide context to composables
const canvasContext: InfiniteCanvasContext = {
  hasEntity: (entityId: EntityId) => entities.has(entityId),
  getEditor: () => editorRef.value,
  subscribeComponent,
  subscribeSingleton,
  registerTickCallback,
};
provide(INFINITE_CANVAS_KEY, canvasContext);

// Provide container ref for FloatingMenu positioning
provide("containerRef", containerRef);

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
  allPlugins.push(ArrowsPlugin);

  allPlugins.push(BasicsPlugin);

  // Add user-provided plugins
  allPlugins.push(...props.plugins);

  // Create editor options from props
  const editorOptions: EditorOptionsInput = {
    store: props.store,
    maxEntities: props.maxEntities,
    userId: props.userId,
    blockDefs: props.blockDefs,
    keybinds: props.keybinds,
    cursors: props.cursors,
    components: props.components,
    singletons: props.singletons,
    systems: props.systems,
    plugins: allPlugins,
  };

  // Create and initialize editor
  const editor = new Editor(containerRef.value, editorOptions);
  await editor.initialize();

  editorRef.value = editor;

  // // Initialize camera with current value
  // cameraRef.value = Camera.snapshot(editor._getContext());

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
        selected: null,
        hovered: false,
        edited: false,
        opacity: null,
      })
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

  // Update selected state
  for (const entityId of selectedQuery.added(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      blockRef.value.selected = Selected.snapshot(ctx, entityId);
    }
  }
  for (const entityId of selectedQuery.removed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef && blockRef.value.selected !== null) {
      blockRef.value.selected = null;
    }
  }
  for (const entityId of selectedQuery.changed(ctx)) {
    const blockRef = blockMap.get(entityId);
    if (blockRef) {
      blockRef.value.selected = Selected.snapshot(ctx, entityId);
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

  // Rebuild sorted array only when blocks added/removed or rank changed
  if (needsResort) {
    const blocks = Array.from(blockMap.values());
    blocks.sort((a, b) => (a.value.block.rank > b.value.block.rank ? 1 : -1));
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

function getBlockStyle(data: BlockData) {
  const camera = cameraRef.value;
  const { block, opacity } = data;
  const screenX = (block.position[0] - camera.left) * camera.zoom;
  const screenY = (block.position[1] - camera.top) * camera.zoom;
  const screenWidth = block.size[0] * camera.zoom;
  const screenHeight = block.size[1] * camera.zoom;

  return {
    position: "absolute" as const,
    left: `${screenX}px`,
    top: `${screenY}px`,
    width: `${screenWidth}px`,
    height: `${screenHeight}px`,
    transform: block.rotateZ !== 0 ? `rotate(${block.rotateZ}rad)` : undefined,
    opacity: opacity !== null ? opacity.value / 255 : undefined,
    pointerEvents: "none" as const,
  };
}
</script>

<template>
  <div
    ref="containerRef"
    :style="{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      '--ic-zoom': cameraRef.zoom,
    }"
  >
    <div
      v-for="itemRef in sortedBlocks"
      :key="itemRef.value.entityId"
      :style="getBlockStyle(itemRef.value)"
      :data-selected="itemRef.value.selected !== null || undefined"
      :data-hovered="itemRef.value.hovered || undefined"
      class="ic-block"
    >
      <slot
        :name="`block:${itemRef.value.block.tag}`"
        :entityId="itemRef.value.entityId"
      >
        <!-- Default blocks -->
        <SelectionBox v-if="itemRef.value.block.tag === 'selection-box'" />
        <TransformBox v-else-if="itemRef.value.block.tag === 'transform-box'" />
        <TransformHandle
        v-else-if="itemRef.value.block.tag === 'transform-handle'"
        :entityId="itemRef.value.entityId"
        />
        <ArrowHandle
          v-else-if="itemRef.value.block.tag === 'arrow-handle'"
        />
        <StickyNote
          v-else-if="itemRef.value.block.tag === 'sticky-note'"
          :entityId="itemRef.value.entityId"
        />
        <Eraser
          v-else-if="itemRef.value.block.tag === 'eraser'"
          :entity-id="itemRef.value.entityId"
        />
        <ArcArrowBlock
          v-else-if="itemRef.value.block.tag === 'arc-arrow'"
          :entity-id="itemRef.value.entityId"
        />
        <ElbowArrowBlock
          v-else-if="itemRef.value.block.tag === 'elbow-arrow'"
          :entity-id="itemRef.value.entityId"
        />
      </slot>
    </div>

    <!-- Floating menu -->
    <FloatingMenu v-if="editorRef">
      <template #default="menuProps">
        <slot name="floating-menu" v-bind="menuProps" />
      </template>
    </FloatingMenu>

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
