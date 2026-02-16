<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, inject, type Ref } from "vue";
import { useSingleton } from "../composables/useSingleton";
import { Camera, Grid } from "@woven-canvas/core";
import type { BackgroundOptions } from "../types";

interface Props {
  background: BackgroundOptions;
}

const props = defineProps<Props>();

// Get camera and grid from ECS singletons
const camera = useSingleton(Camera);
const grid = useSingleton(Grid);

// Get container ref from InfiniteCanvas
const containerRef = inject<Ref<HTMLElement | null>>("containerRef");

// Track screen dimensions via ResizeObserver (immediate updates)
const screen = ref({ width: 0, height: 0 });
let resizeObserver: ResizeObserver | null = null;

const canvasRef = ref<HTMLCanvasElement | null>(null);

// Create a reusable pattern canvas
let patternCanvas: HTMLCanvasElement | null = null;
if (typeof document !== "undefined") {
  patternCanvas = document.createElement("canvas");
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const radius = size / 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function createDotPattern(
  colWidth: number,
  rowHeight: number,
  background: BackgroundOptions
): CanvasPattern | null {
  if (!patternCanvas) return null;

  const dotSize = background.dotSize ?? 2;
  const width = colWidth * background.subdivisionStep;
  const height = rowHeight * background.subdivisionStep;

  patternCanvas.width = width;
  patternCanvas.height = height;

  const patternCtx = patternCanvas.getContext("2d");
  if (!patternCtx) return null;

  patternCtx.clearRect(0, 0, width, height);
  patternCtx.fillStyle = background.strokeColor;

  if (background.subdivisionStep === 1) {
    drawDot(patternCtx, width / 2, height / 2, dotSize);
  } else {
    for (let x = 0; x < background.subdivisionStep; x++) {
      for (let y = 0; y < background.subdivisionStep; y++) {
        const centerX = (x + 0.5) * (width / background.subdivisionStep);
        const centerY = (y + 0.5) * (height / background.subdivisionStep);
        const isStrongDot = x === 0 && y === 0;
        const size = isStrongDot ? 2 * dotSize : dotSize;
        drawDot(patternCtx, centerX, centerY, size);
      }
    }
  }

  return patternCtx.createPattern(patternCanvas, "repeat");
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lineWidth: number
): void {
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function createGridPattern(
  colWidth: number,
  rowHeight: number,
  background: BackgroundOptions
): CanvasPattern | null {
  if (!patternCanvas) return null;

  const lineSize = background.gridSize ?? 1;
  const width = colWidth * background.subdivisionStep;
  const height = rowHeight * background.subdivisionStep;

  patternCanvas.width = width;
  patternCanvas.height = height;

  const patternCtx = patternCanvas.getContext("2d");
  if (!patternCtx) return null;

  patternCtx.clearRect(0, 0, width, height);
  patternCtx.strokeStyle = background.strokeColor;

  if (background.subdivisionStep === 1) {
    drawLine(patternCtx, 0, 0, width, 0, lineSize);
    drawLine(patternCtx, 0, 0, 0, height, lineSize);
  } else {
    const cellWidth = width / background.subdivisionStep;
    const cellHeight = height / background.subdivisionStep;

    for (let x = 0; x <= background.subdivisionStep; x++) {
      const posX = x * cellWidth;
      const isStrongLine = x % background.subdivisionStep === 0;
      drawLine(
        patternCtx,
        posX,
        0,
        posX,
        height,
        isStrongLine ? 3 * lineSize : lineSize
      );
    }

    for (let y = 0; y <= background.subdivisionStep; y++) {
      const posY = y * cellHeight;
      const isStrongLine = y % background.subdivisionStep === 0;
      drawLine(
        patternCtx,
        0,
        posY,
        width,
        posY,
        isStrongLine ? 3 * lineSize : lineSize
      );
    }
  }

  return patternCtx.createPattern(patternCanvas, "repeat");
}

function renderDots(ctx: CanvasRenderingContext2D): void {
  let colWidth = grid.value.colWidth;
  let rowHeight = grid.value.rowHeight;
  const step = props.background.subdivisionStep;

  const w = screen.value.width;
  const h = screen.value.height;

  const left = camera.value.left;
  const top = camera.value.top;
  const right = left + w / camera.value.zoom;
  const bottom = top + h / camera.value.zoom;

  let patternWidth = colWidth * step;
  let patternHeight = rowHeight * step;
  let startX = 0;
  let startY = 0;
  let numRows = Number.POSITIVE_INFINITY;
  let numCols = Number.POSITIVE_INFINITY;

  while (true) {
    patternWidth = step * colWidth;
    patternHeight = step * rowHeight;
    startX = Math.floor(left / patternWidth) * patternWidth;
    startY = Math.floor(top / patternHeight) * patternHeight;
    const endX = Math.ceil(right / patternWidth) * patternWidth;
    const endY = Math.ceil(bottom / patternHeight) * patternHeight;
    numCols = Math.round((endX - startX) / colWidth);
    numRows = Math.round((endY - startY) / rowHeight);

    if (Math.max(numCols, numRows) > 200) {
      colWidth *= 2;
      rowHeight *= 2;
    } else {
      break;
    }
  }

  const colWidthCanvas = colWidth * camera.value.zoom;
  const rowHeightCanvas = rowHeight * camera.value.zoom;

  const roundedX = Math.round(colWidthCanvas);
  const roundedY = Math.round(rowHeightCanvas);

  const pattern = createDotPattern(roundedX, roundedY, props.background);
  if (!pattern) return;

  pattern.setTransform(
    new DOMMatrix().scale(
      colWidthCanvas / roundedX,
      rowHeightCanvas / roundedY
    )
  );

  const offsetX = (startX - left - colWidth / 2) * camera.value.zoom;
  const offsetY = (startY - top - rowHeight / 2) * camera.value.zoom;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.fillStyle = pattern;
  ctx.fillRect(
    0,
    0,
    w + patternWidth * camera.value.zoom,
    h + patternHeight * camera.value.zoom
  );
  ctx.restore();
}

function renderGrid(ctx: CanvasRenderingContext2D): void {
  let colWidth = grid.value.colWidth;
  let rowHeight = grid.value.rowHeight;
  const step = props.background.subdivisionStep;

  const w = screen.value.width;
  const h = screen.value.height;

  const left = camera.value.left;
  const top = camera.value.top;
  const right = left + w / camera.value.zoom;
  const bottom = top + h / camera.value.zoom;

  let patternWidth = colWidth * step;
  let patternHeight = rowHeight * step;
  let startX = 0;
  let startY = 0;
  let numRows = Number.POSITIVE_INFINITY;
  let numCols = Number.POSITIVE_INFINITY;

  while (true) {
    patternWidth = step * colWidth;
    patternHeight = step * rowHeight;
    startX = Math.floor(left / patternWidth) * patternWidth;
    startY = Math.floor(top / patternHeight) * patternHeight;
    const endX = Math.ceil(right / patternWidth) * patternWidth;
    const endY = Math.ceil(bottom / patternHeight) * patternHeight;
    numCols = Math.round((endX - startX) / colWidth);
    numRows = Math.round((endY - startY) / rowHeight);

    if (Math.max(numCols, numRows) > 200) {
      colWidth *= 2;
      rowHeight *= 2;
    } else {
      break;
    }
  }

  const colWidthCanvas = colWidth * camera.value.zoom;
  const rowHeightCanvas = rowHeight * camera.value.zoom;

  const roundedX = Math.round(colWidthCanvas);
  const roundedY = Math.round(rowHeightCanvas);

  const pattern = createGridPattern(roundedX, roundedY, props.background);
  if (!pattern) return;

  pattern.setTransform(
    new DOMMatrix().scale(
      colWidthCanvas / roundedX,
      rowHeightCanvas / roundedY
    )
  );

  const offsetX = (startX - left) * camera.value.zoom;
  const offsetY = (startY - top) * camera.value.zoom;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.fillStyle = pattern;
  ctx.fillRect(
    0,
    0,
    w + patternWidth * camera.value.zoom,
    h + patternHeight * camera.value.zoom
  );
  ctx.restore();
}

function renderBackground(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = screen.value;
  if (width === 0 || height === 0) return;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  // Fill background color
  ctx.fillStyle = props.background.color;
  ctx.fillRect(0, 0, width, height);

  if (props.background.kind === "dots") {
    renderDots(ctx);
  } else if (props.background.kind === "grid") {
    renderGrid(ctx);
  }
}

// Watch for changes and re-render
watch(
  () => [props.background, camera.value, grid.value, screen.value],
  () => {
    renderBackground();
  },
  { deep: true }
);

onMounted(() => {
  // Set up ResizeObserver for immediate screen dimension updates
  const container = containerRef?.value;
  if (container) {
    const updateScreenSize = () => {
      screen.value = {
        width: container.clientWidth,
        height: container.clientHeight,
      };
    };
    updateScreenSize();
    resizeObserver = new ResizeObserver(updateScreenSize);
    resizeObserver.observe(container);
  }

  renderBackground();
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas
    ref="canvasRef"
    :style="{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    }"
  />
</template>
