import "./style.css";
import { Editor, Camera, removeEntity } from "@infinitecanvas/editor";
import { ControlsPlugin } from "@infinitecanvas/plugin-controls";
import { Store } from "@infinitecanvas/store";
import { InfiniteCanvasPlugin } from "@infinitecanvas/plugin-infinite-canvas";

import { RendererPlugin, blockQuery, createBlock } from "./ShapesPlugin";

// Create canvas element
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div id="canvas-container">
    <div id="info">
      <h3>Infinite Canvas Demo</h3>
      <p><strong>Scroll:</strong> Pan the canvas</p>
      <p><strong>Ctrl/Cmd + Scroll:</strong> Zoom in/out</p>
      <p><strong>Middle Mouse Drag:</strong> Pan the canvas</p>
      <p><strong>Left Click:</strong> Select blocks</p>
      <p><strong>Ctrl/Cmd + Z:</strong> Undo</p>
      <p><strong>Ctrl/Cmd + Y:</strong> Redo</p>
      <div id="buttons">
        <button id="add-block">Add Block</button>
        <button id="clear-blocks">Clear Blocks</button>
      </div>
      <div id="camera-info">
        <span>X: <span id="cam-x">0</span></span>
        <span>Y: <span id="cam-y">0</span></span>
        <span>Zoom: <span id="cam-zoom">100</span>%</span>
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
  dbName: "editor-canvas",
  // websocketUrl: "ws://localhost:8787",
  roomId: "editor-canvas",
});

// Create editor with plugins
const editor = new Editor(container, {
  store,
  plugins: [
    ControlsPlugin({ minZoom: 0.1, maxZoom: 10 }),
    InfiniteCanvasPlugin,
    RendererPlugin({ canvas, ctx2d }),
  ],
});

// Initialize editor
await editor.initialize();

// Keyboard shortcuts for undo/redo
document.addEventListener("keydown", (e) => {
  const isMod = e.ctrlKey || e.metaKey;

  if (isMod && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    store.undo();
  } else if (isMod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
    e.preventDefault();
    store.redo();
  }
});

// UI elements for camera info
const camX = document.getElementById("cam-x")!;
const camY = document.getElementById("cam-y")!;
const camZoom = document.getElementById("cam-zoom")!;

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

  // Read camera state and update UI
  const ctx = editor._getContext();
  const camera = Camera.read(ctx);

  camX.textContent = camera.left.toFixed(0);
  camY.textContent = camera.top.toFixed(0);
  camZoom.textContent = (camera.zoom * 100).toFixed(0);

  requestAnimationFrame(loop);
}

loop();
