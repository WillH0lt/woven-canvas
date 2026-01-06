<script setup lang="ts">
import {
  onMounted,
  onUnmounted,
  shallowRef,
  provide,
  type ShallowRef,
} from "vue";
import {
  Editor,
  Camera,
  hasComponent,
  Block,
  EventType,
  type EntityId,
  type InferComponentType,
} from "@infinitecanvas/editor";
import { BLOCK_REFS_KEY, type BlockRefs } from "../composables/useBlock";

type BlockData = InferComponentType<typeof Block.schema>;

/**
 * Block entity with per-component refs for granular reactivity.
 */
interface BlockEntity {
  _key: EntityId;
  block: ShallowRef<BlockData>;
  components: Record<string, ShallowRef<unknown>>; // name -> ref
}

const props = defineProps<{
  editor: Editor;
}>();

// Define slots with entityId
defineSlots<{
  [slotName: string]: (props: { entityId: EntityId }) => any;
}>();

// Per-entity block entries with component refs
const blockEntities = new Map<EntityId, BlockEntity>();
// Sorted array for v-for iteration
const sortedBlocks = shallowRef<BlockEntity[]>([]);
const cameraRef = shallowRef({ left: 0, top: 0, zoom: 1 });

// Provide refs to useBlock composable
const blockRefs: BlockRefs = {
  getBlockRef: (entityId: EntityId) => blockEntities.get(entityId)?.block,
  getComponentRef: (entityId: EntityId, name: string) =>
    blockEntities.get(entityId)?.components[name],
};
provide(BLOCK_REFS_KEY, blockRefs);

let cancel: (() => void) | null = null;
let eventIndex = 0;
let needsSort = false;

function tick() {
  updateBlocks();
  updateCamera();
  cancel = props.editor.nextTick(tick);
}

onMounted(() => {
  cancel = props.editor.nextTick(tick);
});

onUnmounted(() => {
  if (cancel) {
    cancel();
  }
});

function createBlockEntity(ctx: any, entityId: EntityId): BlockEntity {
  const blockData = Block.snapshot(ctx, entityId);
  const blockDef = props.editor.blockDefs[blockData.tag];

  const components: Record<string, ShallowRef<unknown>> = {};
  if (blockDef?.components) {
    for (const componentDef of blockDef.components) {
      if (hasComponent(ctx, entityId, componentDef)) {
        const name = componentDef.name.toLowerCase();
        components[name] = shallowRef(componentDef.snapshot(ctx, entityId));
      }
    }
  }

  return {
    _key: entityId,
    block: shallowRef(blockData),
    components,
  };
}

function updateBlocks() {
  const ctx = props.editor._getContext();
  const { events, newIndex } = ctx.eventBuffer.readEvents(eventIndex);
  eventIndex = newIndex;

  const blockComponentId = Block._getComponentId(ctx);

  for (const { entityId, eventType, componentId } of events) {
    if (eventType === EventType.COMPONENT_ADDED) {
      if (componentId === blockComponentId) {
        // Block component added - create entry
        if (!blockEntities.has(entityId)) {
          blockEntities.set(entityId, createBlockEntity(ctx, entityId));
          needsSort = true;
        }
      }
    } else if (
      eventType === EventType.REMOVED ||
      (eventType === EventType.COMPONENT_REMOVED &&
        componentId === blockComponentId)
    ) {
      // Entity or Block component removed
      if (
        blockEntities.has(entityId) &&
        !hasComponent(ctx, entityId, Block, false)
      ) {
        blockEntities.delete(entityId);
        needsSort = true;
      }
    } else if (eventType === EventType.CHANGED) {
      const entity = blockEntities.get(entityId);
      if (!entity) continue;

      if (componentId === blockComponentId) {
        // Block component changed - update ref
        const oldRank = entity.block.value.rank;
        entity.block.value = Block.snapshot(ctx, entityId);
        if (oldRank !== entity.block.value.rank) {
          needsSort = true;
        }
      } else {
        // Other component changed - update that ref
        const componentDef = props.editor.components.get(componentId);
        if (componentDef) {
          const name = componentDef.name.toLowerCase();
          const ref = entity.components[name];
          if (ref) {
            ref.value = componentDef.snapshot(ctx, entityId);
          }
        }
      }
    }
  }

  if (needsSort) {
    const entities = Array.from(blockEntities.values());
    entities.sort((a, b) => (a.block.value.rank > b.block.value.rank ? 1 : -1));
    sortedBlocks.value = entities;
    needsSort = false;
  }
}

function updateCamera() {
  const ctx = props.editor._getContext();
  const camera = Camera.read(ctx);
  cameraRef.value = {
    left: camera.left,
    top: camera.top,
    zoom: camera.zoom,
  };
}

function getBlockStyle(block: ShallowRef<BlockData>) {
  const camera = cameraRef.value;
  const b = block.value;
  const screenX = (b.position[0] - camera.left) * camera.zoom;
  const screenY = (b.position[1] - camera.top) * camera.zoom;
  const screenWidth = b.size[0] * camera.zoom;
  const screenHeight = b.size[1] * camera.zoom;

  return {
    position: "absolute" as const,
    left: `${screenX}px`,
    top: `${screenY}px`,
    width: `${screenWidth}px`,
    height: `${screenHeight}px`,
    transform: b.rotateZ !== 0 ? `rotate(${b.rotateZ}rad)` : undefined,
    pointerEvents: "auto" as const,
  };
}
</script>

<template>
  <div
    class="infinite-canvas"
    :style="{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
    }"
  >
    <div
      v-for="entity in sortedBlocks"
      :key="entity._key"
      class="infinite-canvas-block"
      :style="getBlockStyle(entity.block)"
    >
      <slot :name="entity.block.value.tag" :entityId="entity._key" />
    </div>
  </div>
</template>
