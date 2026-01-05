<script setup lang="ts">
import { shallowRef } from "vue";
import {
  Editor,
  Camera,
  defineQuery,
  hasComponent,
  Block,
  Selected,
  Hovered,
  Edited,
  type EntityId,
} from "@infinitecanvas/editor";

/** Block data passed to slots */
export interface BlockSlotProps {
  block: {
    tag: string;
    position: [number, number];
    size: [number, number];
    rotateZ: number;
    rank: string;
  };
  entityId: EntityId;
  selected: boolean;
  hovered: boolean;
  editing: boolean;
}

const blockQuery = defineQuery((q) => q.with(Block));

const props = defineProps<{
  editor: Editor;
}>();

const blocksRef = shallowRef<BlockSlotProps[]>([]);
const cameraRef = shallowRef({ left: 0, top: 0, zoom: 1 });

function updateBlocks() {
  const ctx = props.editor._getContext();
  const blocks: BlockSlotProps[] = [];

  for (const entityId of blockQuery.current(ctx)) {
    const blockData = Block.read(ctx, entityId);
    blocks.push({
      block: {
        tag: blockData.tag,
        position: [...blockData.position] as [number, number],
        size: [...blockData.size] as [number, number],
        rotateZ: blockData.rotateZ,
        rank: blockData.rank,
      },
      entityId,
      selected: hasComponent(ctx, entityId, Selected),
      hovered: hasComponent(ctx, entityId, Hovered),
      editing: hasComponent(ctx, entityId, Edited),
    });
  }

  // Sort by rank for z-ordering
  blocks.sort((a, b) => (a.block.rank > b.block.rank ? 1 : -1));

  blocksRef.value = blocks;
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

function getBlockStyle(block: BlockSlotProps["block"]) {
  const camera = cameraRef.value;
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
    transformOrigin: "center center",
    pointerEvents: "auto" as const,
  };
}

/** Call this each frame after editor.tick() to update the view */
function tick() {
  updateBlocks();
  updateCamera();
}

defineExpose({
  tick,
});
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
      v-for="blockProps in blocksRef"
      :key="blockProps.entityId"
      class="infinite-canvas-block"
      :style="getBlockStyle(blockProps.block)"
      :data-entity-id="blockProps.entityId"
    >
      <slot :name="blockProps.block.tag" v-bind="blockProps" />
    </div>
  </div>
</template>
