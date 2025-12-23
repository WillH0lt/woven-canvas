import {
  defineSystem,
  defineQuery,
  createEntity,
  addComponent,
  Persistent,
  Camera,
  getPluginResources,
  type EditorPlugin,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import {
  Block,
  Selected,
  Hovered,
} from "@infinitecanvas/plugin-infinite-canvas";

/**
 * Resources for the RendererPlugin.
 * These are passed when creating the plugin and accessible in systems.
 */
export interface RendererPluginResources {
  /** Canvas element for rendering */
  canvas: HTMLCanvasElement;
  /** 2D rendering context */
  ctx2d: CanvasRenderingContext2D;
}

/** Query for all entities with Block component */
export const blockQuery = defineQuery((q) => q.with(Block));

/** Query for selected blocks */
const selectedQuery = defineQuery((q) => q.with(Block).with(Selected));

/** Query for hovered blocks */
const hoveredQuery = defineQuery((q) => q.with(Block).with(Hovered));

// Block colors for demo
const BLOCK_COLORS = [
  "#e94560",
  "#0f3460",
  "#16c79a",
  "#f9a826",
  "#6c5ce7",
  "#fd79a8",
];

/**
 * Renderer system - draws the grid and all blocks to the canvas.
 *
 * This runs in the render phase and handles:
 * - Clearing the canvas
 * - Drawing the background grid
 * - Drawing the origin marker
 * - Rendering all Block entities
 * - Highlighting selected and hovered blocks
 */
const blockRendererSystem = defineSystem((ctx: Context) => {
  const resources = getPluginResources<RendererPluginResources>(
    ctx,
    "renderer"
  );
  const { canvas, ctx2d } = resources;
  const camera = Camera.read(ctx);

  const width = canvas.width;
  const height = canvas.height;
  const zoom = camera.zoom;

  // Build sets for quick lookup
  const selectedSet = new Set(selectedQuery.current(ctx));
  const hoveredSet = new Set(hoveredQuery.current(ctx));

  // === Clear canvas and draw background ===
  ctx2d.fillStyle = "#1a1a2e";
  ctx2d.fillRect(0, 0, width, height);

  // === Draw grid lines ===
  const gridSize = 50;

  ctx2d.strokeStyle = "#16213e";
  ctx2d.lineWidth = 1;

  // Vertical lines
  const startX = Math.floor(camera.left / gridSize) * gridSize;
  for (let x = startX; x < camera.left + width / zoom; x += gridSize) {
    const screenX = (x - camera.left) * zoom;
    ctx2d.beginPath();
    ctx2d.moveTo(screenX, 0);
    ctx2d.lineTo(screenX, height);
    ctx2d.stroke();
  }

  // Horizontal lines
  const startY = Math.floor(camera.top / gridSize) * gridSize;
  for (let y = startY; y < camera.top + height / zoom; y += gridSize) {
    const screenY = (y - camera.top) * zoom;
    ctx2d.beginPath();
    ctx2d.moveTo(0, screenY);
    ctx2d.lineTo(width, screenY);
    ctx2d.stroke();
  }

  // === Draw origin marker ===
  const originX = (0 - camera.left) * zoom;
  const originY = (0 - camera.top) * zoom;

  ctx2d.strokeStyle = "#e94560";
  ctx2d.lineWidth = 2;
  ctx2d.beginPath();
  ctx2d.moveTo(originX - 20, originY);
  ctx2d.lineTo(originX + 20, originY);
  ctx2d.moveTo(originX, originY - 20);
  ctx2d.lineTo(originX, originY + 20);
  ctx2d.stroke();

  // Origin label
  ctx2d.fillStyle = "#e94560";
  ctx2d.font = "14px monospace";
  ctx2d.textAlign = "left";
  ctx2d.fillText("Origin (0, 0)", originX + 25, originY - 10);

  // === Draw all blocks ===
  for (const eid of blockQuery.current(ctx)) {
    const block = Block.read(ctx, eid);
    const isSelected = selectedSet.has(eid);
    const isHovered = hoveredSet.has(eid);

    // Block uses position as top-left, not center
    const screenX = (block.position[0] - camera.left) * zoom;
    const screenY = (block.position[1] - camera.top) * zoom;
    const screenW = block.size[0] * zoom;
    const screenH = block.size[1] * zoom;

    // Save context for rotation
    ctx2d.save();

    // Translate to center, rotate, then draw
    const centerX = screenX + screenW / 2;
    const centerY = screenY + screenH / 2;
    ctx2d.translate(centerX, centerY);
    ctx2d.rotate(block.rotateZ);

    // Draw the rectangle (centered at origin after translation)
    // Use a color based on entity ID for variety
    const colorIndex = eid % BLOCK_COLORS.length;
    ctx2d.fillStyle = BLOCK_COLORS[colorIndex];
    ctx2d.fillRect(-screenW / 2, -screenH / 2, screenW, screenH);

    // Draw selection highlight
    if (isSelected) {
      ctx2d.strokeStyle = "#00d4ff";
      ctx2d.lineWidth = 3;
      ctx2d.strokeRect(-screenW / 2, -screenH / 2, screenW, screenH);
    } else if (isHovered) {
      ctx2d.strokeStyle = "#ffffff";
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(-screenW / 2, -screenH / 2, screenW, screenH);
    }

    ctx2d.restore();

    // Label with world coordinates (outside rotation)
    const labelX = screenX + screenW / 2;
    const labelY = screenY + screenH + 15 * zoom;
    ctx2d.fillStyle = "#ffffff";
    ctx2d.font = `${12 * Math.min(zoom, 1.5)}px monospace`;
    ctx2d.textAlign = "center";
    ctx2d.fillText(
      `(${Math.round(block.position[0])}, ${Math.round(block.position[1])})`,
      labelX,
      labelY
    );
  }
});

/**
 * Helper function to create a new block entity.
 *
 * @param ctx - ECS context
 * @param x - World X position (left)
 * @param y - World Y position (top)
 * @param width - Block width
 * @param height - Block height
 * @returns The entity ID of the created block
 */
export function createBlock(
  ctx: Context,
  x: number,
  y: number,
  width: number,
  height: number
): EntityId {
  const entityId = createEntity(ctx);
  addComponent(ctx, entityId, Persistent, {
    id: crypto.randomUUID(),
  });
  addComponent(ctx, entityId, Block, {
    position: [x, y],
    size: [width, height],
  });
  // Mark as persistent so it can be selected
  addComponent(ctx, entityId, Persistent, {});
  return entityId;
}

/**
 * RendererPlugin - Renders blocks from the InfiniteCanvasPlugin.
 *
 * This plugin provides:
 * - Renderer system for drawing grid and blocks
 * - Selection and hover highlighting
 * - createBlock() helper for spawning new blocks
 *
 * Usage:
 * ```typescript
 * import { RendererPlugin, createBlock } from './ShapesPlugin';
 *
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement;
 * const ctx2d = canvas.getContext('2d')!;
 *
 * const editor = new Editor(container, {
 *   plugins: [
 *     InfiniteCanvasPlugin,
 *     RendererPlugin({ canvas, ctx2d }),
 *   ],
 * });
 *
 * await editor.initialize();
 *
 * // Create some blocks
 * editor.nextTick((ctx) => {
 *   createBlock(ctx, 100, 100, 60, 60);
 * });
 * ```
 */
export function RendererPlugin(
  resources: RendererPluginResources
): EditorPlugin<RendererPluginResources> {
  return {
    name: "renderer",
    resources,
    dependencies: ["infiniteCanvas"],
    renderSystems: [blockRendererSystem],
  };
}

// Keep old exports for backwards compatibility during transition
export { RendererPlugin as ShapesPlugin };
export type { RendererPluginResources as ShapesPluginResources };
