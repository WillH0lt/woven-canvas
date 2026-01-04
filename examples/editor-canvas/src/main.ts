import "./style.css";
import {
  Editor,
  Camera,
  removeEntity,
  type Context,
} from "@infinitecanvas/editor";
import { CanvasControlsPlugin } from "@infinitecanvas/plugin-canvas-controls";
import { Store } from "@infinitecanvas/store";
import { InfiniteCanvasPlugin } from "@infinitecanvas/plugin-selection";

import { ShapesPlugin, Shape, shapeQuery, createShape } from "./ShapesPlugin";

// Create canvas element
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div id="canvas-container">
    <div id="info">
      <h3>Canvas Controls Demo</h3>
      <p><strong>Scroll:</strong> Pan the canvas</p>
      <p><strong>Ctrl/Cmd + Scroll:</strong> Zoom in/out</p>
      <p><strong>Middle Mouse Drag:</strong> Pan the canvas</p>
      <p><strong>Left Click + Drag:</strong> Move shapes</p>
      <p><strong>Ctrl/Cmd + Z:</strong> Undo</p>
      <p><strong>Ctrl/Cmd + Y:</strong> Redo</p>
      <div id="buttons">
        <button id="add-shape">Add Shape</button>
        <button id="clear-shapes">Clear Shapes</button>
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
const ctxCanvas = canvas.getContext("2d")!;

// Create Loro store (handles IndexedDB persistence and optional WebSocket sync)
const store = new Store({
  // dbName: "editor-canvas",
  websocketUrl: "ws://localhost:8787",
  roomId: "editor-canvas",
});

// Create editor with CorePlugin, CanvasControlsPlugin, and ShapesPlugin
const editor = new Editor(container, {
  store,
  plugins: [
    CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 10 }),
    InfiniteCanvasPlugin,
    ShapesPlugin,
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

// Shape colors
const colors = [
  "#e94560",
  "#0f3460",
  "#16c79a",
  "#f9a826",
  "#6c5ce7",
  "#fd79a8",
];

// Add shape button
document.getElementById("add-shape")!.addEventListener("click", () => {
  editor.nextTick((ctx) => {
    const camera = Camera.read(ctx);
    // Place shape in center of current view
    const x = camera.left + canvas.width / camera.zoom / 2;
    const y = camera.top + canvas.height / camera.zoom / 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    createShape(ctx, x, y, 60, 60, color);
  });
});

// Clear shapes button
document.getElementById("clear-shapes")!.addEventListener("click", () => {
  editor.nextTick((ctx) => {
    for (const eid of shapeQuery.current(ctx)) {
      removeEntity(ctx, eid);
    }
  });
});

// Draw a grid on the canvas to visualize panning/zooming
function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: { left: number; top: number; zoom: number }
) {
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  // Grid settings
  const gridSize = 50;
  const zoom = camera.zoom;

  // Draw grid lines
  ctx.strokeStyle = "#16213e";
  ctx.lineWidth = 1;

  // Vertical lines
  const startX = Math.floor(camera.left / gridSize) * gridSize;
  for (let x = startX; x < camera.left + width / zoom; x += gridSize) {
    const screenX = (x - camera.left) * zoom;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, height);
    ctx.stroke();
  }

  // Horizontal lines
  const startY = Math.floor(camera.top / gridSize) * gridSize;
  for (let y = startY; y < camera.top + height / zoom; y += gridSize) {
    const screenY = (y - camera.top) * zoom;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(width, screenY);
    ctx.stroke();
  }

  // Draw origin marker
  const originX = (0 - camera.left) * zoom;
  const originY = (0 - camera.top) * zoom;

  // Origin crosshair
  ctx.strokeStyle = "#e94560";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originX - 20, originY);
  ctx.lineTo(originX + 20, originY);
  ctx.moveTo(originX, originY - 20);
  ctx.lineTo(originX, originY + 20);
  ctx.stroke();

  // Draw "origin" label
  ctx.fillStyle = "#e94560";
  ctx.font = "14px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Origin (0, 0)", originX + 25, originY - 10);
}

// Draw all shapes from the ECS
function drawShapes(
  canvasCtx: CanvasRenderingContext2D,
  ecsCtx: Context,
  camera: { left: number; top: number; zoom: number }
) {
  const zoom = camera.zoom;

  // Iterate all Shape entities and render them
  for (const eid of shapeQuery.current(ecsCtx)) {
    const shape = Shape.read(ecsCtx, eid);

    const screenX = (shape.position[0] - camera.left) * zoom;
    const screenY = (shape.position[1] - camera.top) * zoom;
    const screenW = shape.size[0] * zoom;
    const screenH = shape.size[1] * zoom;

    // Draw the rectangle
    canvasCtx.fillStyle = shape.color;
    canvasCtx.fillRect(
      screenX - screenW / 2,
      screenY - screenH / 2,
      screenW,
      screenH
    );

    // Label with world coordinates
    canvasCtx.fillStyle = "#ffffff";
    canvasCtx.font = `${12 * Math.min(zoom, 1.5)}px monospace`;
    canvasCtx.textAlign = "center";
    canvasCtx.fillText(
      `(${Math.round(shape.position[0])}, ${Math.round(shape.position[1])})`,
      screenX,
      screenY + screenH / 2 + 15 * zoom
    );
  }
}

// Resize canvas to fill container
function resizeCanvas() {
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Main loop
function loop() {
  // Run one frame of the editor
  editor.tick();

  // Read camera state and update display
  const ctx = editor._getContext();
  const camera = Camera.read(ctx);

  // Update UI
  camX.textContent = camera.left.toFixed(0);
  camY.textContent = camera.top.toFixed(0);
  camZoom.textContent = (camera.zoom * 100).toFixed(0);

  // Draw the canvas
  drawGrid(ctxCanvas, camera);
  drawShapes(ctxCanvas, ctx, camera);

  requestAnimationFrame(loop);
}

loop();
