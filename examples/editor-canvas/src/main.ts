import "./style.css";
import { Editor, Camera } from "@infinitecanvas/editor";
import { ControlsPlugin } from "@infinitecanvas/plugin-controls";
import { ShapesPlugin, Shape, shapeQuery, createShape } from "./ShapesPlugin";
import { LoroStore } from "./LoroStore";

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
const store = new LoroStore({
  dbName: "editor-canvas",
  // Uncomment to enable multiplayer:
  // websocketUrl: "ws://localhost:8787",
  // roomId: "editor-canvas",
});

// Initialize the store (loads from IndexedDB)
await store.initialize();

// Register shape component for Loro storage (use the component's stable name)
store.registerComponent(Shape.name);

// Create editor with CorePlugin, ControlsPlugin, and ShapesPlugin
const editor = new Editor(container, {
  store,
  plugins: [ControlsPlugin({ minZoom: 0.1, maxZoom: 10 }), ShapesPlugin],
});

// Initialize editor
await editor.initialize();

// Create some initial shapes only if this is first load (no shapes exist)
const ctx = editor._getContext();
if (shapeQuery.current(ctx).length === 0) {
  createShape(ctx, 100, 100, 60, 60, "#0f3460");
  createShape(ctx, 250, 150, 80, 80, "#533483");
  createShape(ctx, 150, 300, 50, 50, "#e94560");
  createShape(ctx, -100, -100, 70, 70, "#16a085");
  createShape(ctx, -200, 200, 90, 90, "#f39c12");
}

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
  ecsCtx: ReturnType<typeof editor._getContext>,
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
