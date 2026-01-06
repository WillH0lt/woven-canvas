import "./style.css";
import {
  Editor,
  Camera,
  removeEntity,
  defineQuery,
  User,
} from "@infinitecanvas/editor";
import { CanvasControlsPlugin } from "@infinitecanvas/plugin-canvas-controls";
import { Store } from "@infinitecanvas/store";
import {
  SelectionPlugin,
  RemoveSelected,
} from "@infinitecanvas/plugin-selection";

import { RendererPlugin, blockQuery, createBlock } from "./ShapesPlugin";

// Create canvas element
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div id="canvas-container">
    <div id="info">
      <div id="buttons">
        <button id="add-block">Add Block</button>
        <button id="clear-blocks">Clear Blocks</button>
      </div>
      <div id="people-here">
        People Here: <span id="people-count">1</span>
      </div>
    </div>
    <canvas id="canvas"></canvas>
  </div>
`;

const container = document.getElementById("canvas-container")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx2d = canvas.getContext("2d")!;

// Create Loro store (handles IndexedDB persistence and optional WebSocket sync)
const store = new Store({
  documentId: "editor-infinite-canvas-2",
  websocketUrl: "ws://localhost:8787",
  useWebSocket: true,
  useLocalPersistence: true,
});

// Create editor with plugins
const editor = new Editor(container, {
  store,
  plugins: [
    CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 10 }),
    SelectionPlugin,
    RendererPlugin({ canvas, ctx2d }),
  ],
});

const users = defineQuery((q) => q.with(User));

let count = 0;
editor.subscribe(users, (ctx, userEntities) => {
  console.log(userEntities.added, userEntities.removed);

  count += userEntities.added.length - userEntities.removed.length;

  peopleCount.textContent = count.toString();
});

// Initialize editor
await editor.initialize();

// Keyboard shortcuts for undo/redo and delete
document.addEventListener("keydown", (e) => {
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
});

// UI elements
const peopleCount = document.getElementById("people-count")!;

// Add block button
document.getElementById("add-block")!.addEventListener("click", () => {
  editor.nextTick((ctx) => {
    const camera = Camera.read(ctx);
    // Place block in center of current view (position is top-left)
    const x = camera.left + canvas.width / camera.zoom / 2 - 30;
    const y = camera.top + canvas.height / camera.zoom / 2 - 30;
    createBlock(ctx, x, y, 60, 60);
  });
});

// Clear blocks button
document.getElementById("clear-blocks")!.addEventListener("click", () => {
  editor.nextTick((ctx) => {
    for (const eid of blockQuery.current(ctx)) {
      removeEntity(ctx, eid);
    }
  });
});

// Resize canvas to fill container
function resizeCanvas() {
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Main loop
function loop() {
  // Run one frame of the editor (includes rendering via ShapesPlugin)
  editor.tick();

  requestAnimationFrame(loop);
}

loop();
