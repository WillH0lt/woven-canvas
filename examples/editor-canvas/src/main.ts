import "./style.css";
import { Editor, Camera } from "@infinitecanvas/editor";
import { ControlsPlugin } from "@infinitecanvas/plugin-controls";

// Create canvas element
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div id="canvas-container">
    <div id="info">
      <h3>Canvas Controls Demo</h3>
      <p><strong>Scroll:</strong> Pan the canvas</p>
      <p><strong>Ctrl/Cmd + Scroll:</strong> Zoom in/out</p>
      <p><strong>Middle Mouse Drag:</strong> Pan the canvas</p>
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

// Create editor with CorePlugin and ControlsPlugin
const editor = new Editor(container, {
  plugins: [ControlsPlugin({ minZoom: 0.1, maxZoom: 10 })],
});

// Initialize editor
await editor.initialize();

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

  // Draw some sample shapes at fixed world positions
  const shapes = [
    { x: 100, y: 100, size: 60, color: "#0f3460" },
    { x: 250, y: 150, size: 80, color: "#533483" },
    { x: 150, y: 300, size: 50, color: "#e94560" },
    { x: -100, y: -100, size: 70, color: "#16a085" },
    { x: -200, y: 200, size: 90, color: "#f39c12" },
  ];

  for (const shape of shapes) {
    const screenX = (shape.x - camera.left) * zoom;
    const screenY = (shape.y - camera.top) * zoom;
    const screenSize = shape.size * zoom;

    ctx.fillStyle = shape.color;
    ctx.fillRect(
      screenX - screenSize / 2,
      screenY - screenSize / 2,
      screenSize,
      screenSize
    );

    // Label with world coordinates
    ctx.fillStyle = "#ffffff";
    ctx.font = `${12 * Math.min(zoom, 1.5)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      `(${shape.x}, ${shape.y})`,
      screenX,
      screenY + screenSize / 2 + 15 * zoom
    );
  }

  // Draw "origin" label
  ctx.fillStyle = "#e94560";
  ctx.font = "14px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Origin (0, 0)", originX + 25, originY - 10);
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

  requestAnimationFrame(loop);
}

loop();
