import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  hasComponent,
  defineQuery,
  type EditorPlugin,
  Synced,
  Block,
  Aabb,
  HitGeometry,
  RankBounds,
  Intersect,
  Controls,
} from "@infinitecanvas/editor";

import { EraserStroke, Erased } from "../../src/components";
import { EraserStateSingleton } from "../../src/singletons";
import { captureEraserSystem } from "../../src/systems/captureEraserSystem";
import { updateEraserSystem } from "../../src/systems/updateEraserSystem";
import { PLUGIN_NAME } from "../../src/constants";
import { EraserState } from "../../src/types";
import {
  createBlock,
  createMockElement,
  createPointerSimulator,
} from "../testUtils";
import { CompleteEraserStroke } from "../../src/commands";

// Query for eraser stroke entities
const eraserStrokeQuery = defineQuery((q) => q.with(EraserStroke));

// Test plugin with both eraser systems
const testPlugin: EditorPlugin = {
  name: PLUGIN_NAME,
  components: [Block, Aabb, Synced, EraserStroke, Erased, HitGeometry],
  singletons: [EraserStateSingleton, RankBounds, Intersect, Controls],
  systems: [captureEraserSystem, updateEraserSystem],
};

describe("captureEraserSystem", () => {
  let editor: Editor;
  let domElement: HTMLDivElement;
  let pointer: ReturnType<typeof createPointerSimulator>;

  beforeEach(async () => {
    domElement = createMockElement() as HTMLDivElement;
    editor = new Editor(domElement, { plugins: [testPlugin] });
    await editor.initialize();

    pointer = createPointerSimulator();
    pointer.reset();

    // Set up eraser tool mapping (left mouse button -> eraser)
    editor.nextTick((ctx) => {
      const controls = Controls.write(ctx);
      controls.leftMouseTool = "eraser";
    });
    await editor.tick();
  });

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
    if (domElement && domElement.parentNode) {
      domElement.parentNode.removeChild(domElement);
    }
  });

  describe("state machine transitions", () => {
    it("should start in Idle state", async () => {
      let state = "";

      editor.nextTick((ctx) => {
        state = EraserStateSingleton.read(ctx).state;
      });
      await editor.tick();

      expect(state).toBe(EraserState.Idle);
    });

    it("should transition to Erasing on pointerDown", async () => {
      let state = "";

      pointer.pointerDown(domElement, 100, 100);
      await editor.tick();

      editor.nextTick((ctx) => {
        state = EraserStateSingleton.read(ctx).state;
      });
      await editor.tick();

      expect(state).toBe(EraserState.Erasing);
    });

    it("should create stroke on pointerDown", async () => {
      let strokeCount = 0;

      pointer.pointerDown(domElement, 100, 100);
      await editor.tick();

      editor.nextTick((ctx) => {
        strokeCount = eraserStrokeQuery.current(ctx).length;
      });
      await editor.tick();

      expect(strokeCount).toBe(1);
    });

    it("should transition back to Idle on pointerUp", async () => {
      let state = "";

      pointer.pointerDown(domElement, 100, 100);
      await editor.tick();

      pointer.pointerUp(100, 100);
      await editor.tick();

      editor.nextTick((ctx) => {
        state = EraserStateSingleton.read(ctx).state;
      });
      await editor.tick();

      expect(state).toBe(EraserState.Idle);
    });

    it("should complete stroke on pointerUp", async () => {
      let strokeCount = 0;
      let commandSpawned = false;

      pointer.pointerDown(domElement, 100, 100);
      await editor.tick();

      pointer.pointerUp(100, 100);
      await editor.tick();

      // Check if CompleteEraserStroke command was spawned (via didSpawnLastFrame)
      editor.nextTick((ctx) => {
        commandSpawned = CompleteEraserStroke.didSpawnLastFrame(ctx);
        strokeCount = eraserStrokeQuery.current(ctx).length;
      });
      await editor.tick();

      // The command should have been spawned and the stroke deleted
      expect(commandSpawned).toBe(true);
      expect(strokeCount).toBe(0);
    });
  });

  describe("pointer movement", () => {
    it("should add points on pointerMove while erasing", async () => {
      let pointCount = 0;

      pointer.pointerDown(domElement, 0, 0);
      await editor.tick();

      pointer.pointerMove(50, 50);
      await editor.tick();

      pointer.pointerMove(100, 100);
      await editor.tick();

      editor.nextTick((ctx) => {
        const strokes = eraserStrokeQuery.current(ctx);
        if (strokes.length > 0) {
          const stroke = EraserStroke.read(ctx, strokes[0]);
          pointCount = stroke.pointCount;
        }
      });
      await editor.tick();

      // Should have at least 2 points (initial + moves)
      expect(pointCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("erasing blocks", () => {
    it("should erase blocks during drag gesture", async () => {
      let blockId: number | undefined;
      let blockExists = true;

      // Create a block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
        });
      });
      await editor.tick();

      // Drag through the block
      pointer.pointerDown(domElement, 90, 125);
      await editor.tick();

      pointer.pointerMove(160, 125);
      await editor.tick();

      pointer.pointerUp(160, 125);
      await editor.tick();

      // Command effects happen in the next tick after spawning
      editor.nextTick((ctx) => {
        // Block is deleted, check entity buffer
        blockExists = ctx.entityBuffer.has(blockId!);
      });
      await editor.tick();

      expect(blockExists).toBe(false);
    });

    it("should not erase blocks if gesture is cancelled", async () => {
      let blockId: number | undefined;
      let blockExists = true;

      // Create a block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
        });
      });
      await editor.tick();

      // Start drag through the block
      pointer.pointerDown(domElement, 90, 125);
      await editor.tick();

      pointer.pointerMove(160, 125);
      await editor.tick();

      // Cancel with Escape key
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "Escape",
          key: "Escape",
          keyCode: 27,
          bubbles: true,
        })
      );
      await editor.tick();

      editor.nextTick((ctx) => {
        blockExists = hasComponent(ctx, blockId!, Block);
      });
      await editor.tick();

      // Block should still exist after cancel
      expect(blockExists).toBe(true);
    });
  });

  describe("tool activation", () => {
    it("should only respond when eraser tool is active", async () => {
      let strokeCount = 0;

      // Switch to a different tool
      editor.nextTick((ctx) => {
        const controls = Controls.write(ctx);
        controls.leftMouseTool = "select";
      });
      await editor.tick();

      // Try to use eraser
      pointer.pointerDown(domElement, 100, 100);
      await editor.tick();

      editor.nextTick((ctx) => {
        strokeCount = eraserStrokeQuery.current(ctx).length;
      });
      await editor.tick();

      // Should NOT create stroke when eraser tool is not active
      expect(strokeCount).toBe(0);
    });
  });
});
