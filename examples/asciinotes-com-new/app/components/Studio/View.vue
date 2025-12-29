<template>
  <div
    class="absolute inset-0 overflow-hidden canvas-container"
    ref="canvasContainer"
  >
    <canvas ref="canvasEl"></canvas>
    <div class="absolute bottom-0 left-0 m-4 flex gap-4">
      <UButton @click="addBlock">Add Block</UButton>
      <UButton @click="clearBlocks">Clear Blocks</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Editor,
  Camera,
  removeEntity,
  type Context,
} from "@infinitecanvas/editor";
import { ControlsPlugin } from "@infinitecanvas/plugin-controls";
import { Store } from "@infinitecanvas/store";
import {
  InfiniteCanvasPlugin,
  RemoveSelected,
} from "@infinitecanvas/plugin-infinite-canvas";

import { RendererPlugin, blockQuery, createBlock } from "./ShapesPlugin";
import "./style.css";

const props = defineProps<{
  pageId: string;
}>();

const canvasContainer = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);

const cameraX = ref(0);
const cameraY = ref(0);
const cameraZoom = ref(100);

let editor: Editor | null = null;
let store: Store | null = null;
let animationId: number | null = null;

watch(
  () => props.pageId,
  async (newPageId) => {
    console.log("Page ID changed:", newPageId);
    disposeEditor();
    await initializeEditor();
  }
);

onMounted(async () => {
  await initializeEditor();

  // Keyboard shortcuts for undo/redo and delete
  document.addEventListener("keydown", handleKeydown);

  // Resize canvas to fill container
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Main loop
  loop();
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("resize", resizeCanvas);
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  disposeEditor();
});

async function initializeEditor() {
  if (!canvasContainer.value || !canvasEl.value) return;

  const canvas = canvasEl.value;
  const ctx2d = canvas.getContext("2d")!;

  // Create Loro store (handles IndexedDB persistence and optional WebSocket sync)
  store = new Store({
    documentId: props.pageId,
    websocketUrl: "ws://localhost:8787",
    useLocalPersistence: true,
    useWebSocket: true,
  });

  // Create editor with plugins
  editor = new Editor(canvasContainer.value, {
    store,
    plugins: [
      ControlsPlugin({ minZoom: 0.1, maxZoom: 10 }),
      InfiniteCanvasPlugin,
      RendererPlugin({ canvas, ctx2d }),
    ],
  });

  // Initialize editor
  await editor.initialize();
}

function disposeEditor() {
  if (editor) {
    editor.dispose();
    editor = null;
  }
  if (store) {
    store.dispose();
    store = null;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!editor || !store) return;

  const isMod = e.ctrlKey || e.metaKey;

  if (isMod && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    store.undo();
  } else if (isMod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
    e.preventDefault();
    store.redo();
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    editor.command(RemoveSelected);
  }
}

function resizeCanvas() {
  if (!canvasContainer.value || !canvasEl.value) return;
  canvasEl.value.width = canvasContainer.value.clientWidth;
  canvasEl.value.height = canvasContainer.value.clientHeight;
}

function loop() {
  if (!editor || !canvasEl.value) return;

  // Run one frame of the editor (includes rendering via ShapesPlugin)
  editor.tick();

  // Read camera state and update UI
  const ctx = editor._getContext();
  const camera = Camera.read(ctx);

  cameraX.value = Math.round(camera.left);
  cameraY.value = Math.round(camera.top);
  cameraZoom.value = Math.round(camera.zoom * 100);

  animationId = requestAnimationFrame(loop);
}

function addBlock() {
  if (!editor || !canvasEl.value) return;

  editor.nextTick((ctx) => {
    const camera = Camera.read(ctx);
    // Place block in center of current view (position is top-left)
    const x = camera.left + canvasEl.value!.width / camera.zoom / 2 - 30;
    const y = camera.top + canvasEl.value!.height / camera.zoom / 2 - 30;
    createBlock(ctx, x, y, 60, 60);
  });
}

function clearBlocks() {
  if (!editor) return;

  editor.nextTick((ctx) => {
    for (const eid of blockQuery.current(ctx)) {
      removeEntity(ctx, eid);
    }
  });
}
</script>
