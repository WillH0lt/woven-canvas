import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { Editor, type EditorPlugin } from "@infinitecanvas/core";
import { Block, Aabb } from "../../src/components";
import { intersectAabb } from "../../src/helpers/intersect";
import { createMockElement, createBlock } from "../testUtils";

// Mock DOM element for tests
const mockDomElement = createMockElement();

// Minimal plugin that registers Block and Aabb components
const TestPlugin: EditorPlugin = {
  name: "test",
  components: [Block, Aabb],
};

describe("intersectAabb", () => {
  let editor: Editor;

  beforeEach(async () => {
    editor = new Editor(mockDomElement, { plugins: [TestPlugin] });
    await editor.initialize();
  });

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
  });

  describe("basic intersection", () => {
    it("should detect intersection when selection box fully contains block", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [50, 50],
          size: [100, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Selection box that fully contains the block
        result = intersectAabb(ctx, [0, 0, 200, 200]);
      });

      await editor.tick();
      expect(result.length).toBe(1);
    });

    it("should detect intersection when selection box overlaps block corner", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Selection box overlaps bottom-right corner
        result = intersectAabb(ctx, [150, 150, 250, 250]);
      });

      await editor.tick();
      expect(result.length).toBe(1);
    });

    it("should not detect intersection when selection box is completely outside", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Selection box completely outside
        result = intersectAabb(ctx, [200, 200, 300, 300]);
      });

      await editor.tick();
      expect(result.length).toBe(0);
    });
  });

  describe("narrow AABB through middle (edge-to-edge intersection)", () => {
    it("should detect narrow horizontal selection passing through block center", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        // Block at (0, 0) to (100, 100)
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Thin horizontal selection from (-10, 45) to (110, 55)
        // Passes through the middle of the block without touching corners
        result = intersectAabb(ctx, [-10, 45, 110, 55]);
      });

      await editor.tick();
      expect(result.length).toBe(1);
    });

    it("should detect narrow vertical selection passing through block center", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        // Block at (0, 0) to (100, 100)
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Thin vertical selection from (45, -10) to (55, 110)
        // Passes through the middle of the block without touching corners
        result = intersectAabb(ctx, [45, -10, 55, 110]);
      });

      await editor.tick();
      expect(result.length).toBe(1);
    });

    it("should detect cross-shaped selection passing through block", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        // Block at (100, 100) to (200, 200)
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Thin selection cutting through from left to right
        result = intersectAabb(ctx, [50, 145, 250, 155]);
      });

      await editor.tick();
      expect(result.length).toBe(1);
    });

    it("should not detect narrow selection that misses the block", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        // Block at (0, 0) to (100, 100)
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Thin horizontal selection above the block
        result = intersectAabb(ctx, [-10, -20, 110, -10]);
      });

      await editor.tick();
      expect(result.length).toBe(0);
    });
  });

  describe("rotated blocks", () => {
    it("should detect narrow selection passing through rotated block", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        // Block at (0, 0) with 45 degree rotation
        // Center is at (50, 50)
        blockId = createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: Math.PI / 4, // 45 degrees
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Thin horizontal selection through center
        // The rotated block extends beyond (-20, -20) to (120, 120) approximately
        result = intersectAabb(ctx, [-50, 45, 150, 55]);
      });

      await editor.tick();
      expect(result.length).toBe(1);
    });

    it("should detect diagonal selection through rotated block", async () => {
      let blockId: number = 0;
      let result: number[] = [];

      editor.nextTick((ctx) => {
        // Block at (50, 50) with 45 degree rotation
        blockId = createBlock(ctx, {
          position: [50, 50],
          size: [100, 100],
          rotateZ: Math.PI / 4,
          synced: false,
        });
        Aabb.expandByBlock(ctx, blockId, blockId);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Selection that passes through the rotated block diagonally
        result = intersectAabb(ctx, [95, 95, 105, 105]);
      });

      await editor.tick();
      expect(result.length).toBe(1);
    });
  });

  describe("multiple blocks", () => {
    it("should detect all blocks that a narrow selection passes through", async () => {
      let result: number[] = [];

      editor.nextTick((ctx) => {
        // Create three blocks in a row
        const block1 = createBlock(ctx, {
          position: [0, 0],
          size: [50, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, block1, block1);

        const block2 = createBlock(ctx, {
          position: [100, 0],
          size: [50, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, block2, block2);

        const block3 = createBlock(ctx, {
          position: [200, 0],
          size: [50, 100],
          synced: false,
        });
        Aabb.expandByBlock(ctx, block3, block3);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        // Thin horizontal selection that passes through all three
        result = intersectAabb(ctx, [-10, 45, 260, 55]);
      });

      await editor.tick();
      expect(result.length).toBe(3);
    });
  });
});
