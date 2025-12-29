import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  hasComponent,
  type EditorPlugin,
  Camera,
  Controls,
  Synced,
} from "@infinitecanvas/editor";
import { Block, Aabb, Hovered } from "../../src/components";
import { Intersect, RankBounds } from "../../src/singletons";
import { PreCaptureIntersect } from "../../src/systems/PreCaptureIntersect";
import {
  simulateMouseMove,
  simulateMouseLeave,
  createMockElement,
} from "../testUtils";

// Mock DOM element for tests
const mockDomElement = createMockElement();

// Factory function to create test plugin with fresh system instance
const testPlugin: EditorPlugin = {
  name: "test",
  components: [Block, Aabb, Hovered],
  singletons: [Intersect, RankBounds],
  preCaptureSystems: [PreCaptureIntersect],
};

describe("preCaptureIntersect", () => {
  let editor: Editor;

  beforeEach(async () => {
    // Create a fresh plugin instance for each test to ensure isolation
    editor = new Editor(mockDomElement, { plugins: [testPlugin] });
    await editor.initialize();
  });

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
  });

  describe("AABB computation", () => {
    it("should add Aabb component to new blocks", async () => {
      let entityId: number | undefined;
      let hasAabb = false;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        hasAabb = hasComponent(ctx, entityId!, Aabb);
      });

      await editor.tick();
      expect(hasAabb).toBe(true);
    });

    it("should compute correct AABB for unrotated block", async () => {
      let entityId: number | undefined;
      let aabbValue: number[] | undefined;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [10, 20],
          size: [100, 50],
          rotateZ: 0,
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const aabb = Aabb.read(ctx, entityId!);
        aabbValue = [...aabb.value];
      });

      await editor.tick();
      // AABB should be [left, top, right, bottom]
      expect(aabbValue).toEqual([10, 20, 110, 70]);
    });

    it("should compute expanded AABB for rotated block", async () => {
      let entityId: number | undefined;
      let aabbValue: number[] | undefined;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        // 100x100 block centered at (50, 50), rotated 45 degrees
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: Math.PI / 4,
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const aabb = Aabb.read(ctx, entityId!);
        aabbValue = [...aabb.value];
      });

      await editor.tick();
      // 45 degree rotation expands the AABB
      // The diagonal of a 100x100 square is ~141.4
      // Half diagonal is ~70.7
      // Center is at (50, 50)
      // So AABB should be roughly (-20.7, -20.7, 120.7, 120.7)
      expect(aabbValue![0]).toBeLessThan(0);
      expect(aabbValue![1]).toBeLessThan(0);
      expect(aabbValue![2]).toBeGreaterThan(100);
      expect(aabbValue![3]).toBeGreaterThan(100);
    });

    it("should update AABB when block changes", async () => {
      let entityId: number | undefined;
      let initialAabb: number[] | undefined;
      let updatedAabb: number[] | undefined;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const aabb = Aabb.read(ctx, entityId!);
        initialAabb = [...aabb.value];

        // Move the block
        const block = Block.write(ctx, entityId!);
        block.position = [50, 50];
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const aabb = Aabb.read(ctx, entityId!);
        updatedAabb = [...aabb.value];
      });

      await editor.tick();
      expect(initialAabb).toEqual([0, 0, 100, 100]);
      expect(updatedAabb).toEqual([50, 50, 150, 150]);
    });
  });

  describe("intersection detection", () => {
    it("should detect block at mouse position", async () => {
      let entityId: number | undefined;
      let intersected: number[] | undefined;

      editor.nextTick((ctx) => {
        // Create a block at (0, 0) with size 100x100
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});
      });

      await editor.tick();

      // Simulate mouse move to center of block
      simulateMouseMove(50, 50);

      // This tick processes the mouse event and runs intersectSystem
      await editor.tick();

      // Read intersections on the next tick (after they were computed)
      editor.nextTick((ctx) => {
        intersected = Intersect.getAll(ctx);
      });

      await editor.tick();
      expect(intersected).toContain(entityId);
    });

    it("should not detect block when mouse is outside", async () => {
      let entityId: number | undefined;
      let intersected: number[] | undefined;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});
      });

      await editor.tick();

      // Simulate mouse move outside the block
      simulateMouseMove(200, 200);

      await editor.tick();

      editor.nextTick((ctx) => {
        intersected = Intersect.getAll(ctx);
      });

      await editor.tick();
      expect(intersected).not.toContain(entityId);
    });

    it("should detect multiple overlapping blocks sorted by z-order", async () => {
      let frontId: number | undefined;
      let backId: number | undefined;
      let intersected: number[] | undefined;

      editor.nextTick((ctx) => {
        // Create back block (lower z-order)
        backId = createEntity(ctx);
        addComponent(ctx, backId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a", // lower rank = behind
        });
        addComponent(ctx, backId, Synced, {});

        // Create front block (higher z-order)
        frontId = createEntity(ctx);
        addComponent(ctx, frontId, Block, {
          position: [25, 25],
          size: [100, 100],
          rank: "b", // higher rank = in front
        });
        addComponent(ctx, frontId, Synced, {});
      });

      await editor.tick();

      // Simulate mouse move to overlapping area
      simulateMouseMove(50, 50);

      await editor.tick();

      editor.nextTick((ctx) => {
        intersected = Intersect.getAll(ctx);
      });

      await editor.tick();
      expect(intersected!.length).toBe(2);
      // Front block (higher rank) should be first
      expect(intersected![0]).toBe(frontId);
      expect(intersected![1]).toBe(backId);
    });

    it("should clear intersections when mouse leaves", async () => {
      let entityId: number | undefined;
      let intersectedBefore: number[] | undefined;
      let intersectedAfter: number[] | undefined;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});
      });

      await editor.tick();

      // Move mouse over block
      simulateMouseMove(50, 50);

      await editor.tick();

      editor.nextTick((ctx) => {
        intersectedBefore = Intersect.getAll(ctx);
      });

      await editor.tick();

      // Mouse leaves
      simulateMouseLeave(mockDomElement);

      await editor.tick();

      editor.nextTick((ctx) => {
        intersectedAfter = Intersect.getAll(ctx);
      });

      await editor.tick();
      expect(intersectedBefore!.length).toBe(1);
      expect(intersectedAfter!.length).toBe(0);
    });
  });

  describe("hover state", () => {
    it("should add Hovered component to topmost block when select tool active", async () => {
      let entityId: number | undefined;
      let isHovered = false;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});

        // Enable select tool
        const controls = Controls.write(ctx);
        controls.leftMouseTool = "select";
      });

      await editor.tick();

      // Simulate mouse move over block
      simulateMouseMove(50, 50);

      await editor.tick();

      editor.nextTick((ctx) => {
        isHovered = hasComponent(ctx, entityId!, Hovered);
      });

      await editor.tick();
      expect(isHovered).toBe(true);
    });

    it("should not add Hovered when select tool is not active", async () => {
      let entityId: number | undefined;
      let isHovered = false;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});

        // Set a different tool
        const controls = Controls.write(ctx);
        controls.leftMouseTool = "pan";
      });

      await editor.tick();

      // Simulate mouse move over block
      simulateMouseMove(50, 50);

      await editor.tick();

      editor.nextTick((ctx) => {
        isHovered = hasComponent(ctx, entityId!, Hovered);
      });

      await editor.tick();
      expect(isHovered).toBe(false);
    });

    it("should remove Hovered when mouse moves to different block", async () => {
      let block1Id: number | undefined;
      let block2Id: number | undefined;
      let block1Hovered = false;
      let block2Hovered = false;

      editor.nextTick((ctx) => {
        // Create two non-overlapping blocks
        block1Id = createEntity(ctx);
        addComponent(ctx, block1Id, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, block1Id, Synced, {});

        block2Id = createEntity(ctx);
        addComponent(ctx, block2Id, Block, {
          position: [200, 0],
          size: [100, 100],
          rank: "b",
        });
        addComponent(ctx, block2Id, Synced, {});

        const controls = Controls.write(ctx);
        controls.leftMouseTool = "select";
      });

      await editor.tick();

      // Move mouse over block 1
      simulateMouseMove(50, 50);

      await editor.tick();

      // Move mouse over block 2
      simulateMouseMove(250, 50);

      await editor.tick();

      editor.nextTick((ctx) => {
        block1Hovered = hasComponent(ctx, block1Id!, Hovered);
        block2Hovered = hasComponent(ctx, block2Id!, Hovered);
      });

      await editor.tick();
      expect(block1Hovered).toBe(false);
      expect(block2Hovered).toBe(true);
    });

    it("should clear Hovered when mouse leaves canvas", async () => {
      let entityId: number | undefined;
      let isHoveredBefore = false;
      let isHoveredAfter = false;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});

        const controls = Controls.write(ctx);
        controls.leftMouseTool = "select";
      });

      await editor.tick();

      // Move mouse over block
      simulateMouseMove(50, 50);

      await editor.tick();

      editor.nextTick((ctx) => {
        isHoveredBefore = hasComponent(ctx, entityId!, Hovered);
      });

      await editor.tick();

      // Mouse leaves
      simulateMouseLeave(mockDomElement);

      await editor.tick();

      editor.nextTick((ctx) => {
        isHoveredAfter = hasComponent(ctx, entityId!, Hovered);
      });

      await editor.tick();
      expect(isHoveredBefore).toBe(true);
      expect(isHoveredAfter).toBe(false);
    });
  });

  describe("camera integration", () => {
    it("should detect blocks at correct world position when camera is panned", async () => {
      let entityId: number | undefined;
      let intersected: number[] | undefined;

      editor.nextTick((ctx) => {
        // Create block at world position (500, 500)
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [500, 500],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});

        // Pan camera to (450, 450) so block is visible at screen (50, 50)
        const camera = Camera.write(ctx);
        camera.left = 450;
        camera.top = 450;
        camera.zoom = 1;
      });

      await editor.tick();

      // Mouse at screen position (50, 50) should hit block at world (500, 500)
      simulateMouseMove(50, 50);

      await editor.tick();

      editor.nextTick((ctx) => {
        intersected = Intersect.getAll(ctx);
      });

      await editor.tick();
      expect(intersected).toContain(entityId);
    });

    it("should detect blocks at correct world position when camera is zoomed", async () => {
      let entityId: number | undefined;
      let intersected: number[] | undefined;

      editor.nextTick((ctx) => {
        // Create block at world position (0, 0) with size 100x100
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});

        // Zoom to 2x - block appears twice as large on screen
        const camera = Camera.write(ctx);
        camera.left = 0;
        camera.top = 0;
        camera.zoom = 2;
      });

      await editor.tick();

      // At 2x zoom, screen position (100, 100) = world position (50, 50)
      // This should be inside the block
      simulateMouseMove(100, 100);

      await editor.tick();

      editor.nextTick((ctx) => {
        intersected = Intersect.getAll(ctx);
      });

      await editor.tick();
      expect(intersected).toContain(entityId);
    });
  });
});
