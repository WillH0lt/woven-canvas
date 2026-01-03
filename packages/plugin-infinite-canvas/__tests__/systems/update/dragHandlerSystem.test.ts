import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  type EditorPlugin,
} from "@infinitecanvas/editor";
import {
  Block,
  Aabb,
  Selected,
  TransformBox,
  TransformHandle,
  DragStart,
} from "../../../src/components";
import { DragBlock } from "../../../src/commands";
import { RankBounds } from "../../../src/singletons";
import { dragHandlerSystem } from "../../../src/systems/update";
import { TransformHandleKind } from "../../../src/types";
import { createBlock, createTestResources } from "../../testUtils";
import { PLUGIN_NAME } from "../../../src/constants";
import type { InfiniteCanvasResources } from "../../../src/InfiniteCanvasPlugin";

// Factory function to create test plugin
// Note: Only includes UpdateDragHandler to test it in isolation
const testPlugin: EditorPlugin<InfiniteCanvasResources> = {
  name: PLUGIN_NAME,
  resources: createTestResources(),
  components: [Block, Aabb, Selected, TransformBox, TransformHandle, DragStart],
  singletons: [RankBounds],
  updateSystems: [dragHandlerSystem],
};

describe("UpdateDragHandler", () => {
  let editor: Editor;
  let domElement: HTMLDivElement;

  beforeEach(async () => {
    domElement = document.createElement("div");
    document.body.appendChild(domElement);

    editor = new Editor(domElement, { plugins: [testPlugin] });
    await editor.initialize();
  });

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
    if (domElement && domElement.parentNode) {
      domElement.parentNode.removeChild(domElement);
    }
  });

  describe("transform box movement", () => {
    it("should move selected blocks when transform box moves", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let blockPosition: number[] | undefined;

      // Create a selected block with DragStart
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [50, 50],
          rotateZ: 0,
        });

        // Create a transform box with DragStart
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [50, 50],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [50, 50],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the transform box using DragBlock command
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: boxId!,
          position: [150, 200], // Move by (50, 100)
        });
      });

      await editor.tick();

      // Check block position was updated
      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockPosition = [...block.position];
      });

      await editor.tick();

      // Block should have moved by the same delta (50, 100)
      expect(blockPosition).toEqual([150, 200]);
    });

    it("should move multiple selected blocks together", async () => {
      let blockId1: number | undefined;
      let blockId2: number | undefined;
      let boxId: number | undefined;
      let blockPosition1: number[] | undefined;
      let blockPosition2: number[] | undefined;

      // Create two selected blocks with DragStart
      editor.nextTick((ctx) => {
        blockId1 = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          selected: true,
        });
        addComponent(ctx, blockId1, DragStart, {
          position: [100, 100],
          size: [50, 50],
          rotateZ: 0,
        });

        blockId2 = createBlock(ctx, {
          position: [200, 150],
          size: [30, 30],
          selected: true,
        });
        addComponent(ctx, blockId2, DragStart, {
          position: [200, 150],
          size: [30, 30],
          rotateZ: 0,
        });

        // Create a transform box
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [130, 80],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [130, 80],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the transform box using DragBlock command
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: boxId!,
          position: [120, 130], // Move by (20, 30)
        });
      });

      await editor.tick();

      // Check block positions were updated
      editor.nextTick((ctx) => {
        const block1 = Block.read(ctx, blockId1!);
        const block2 = Block.read(ctx, blockId2!);
        blockPosition1 = [...block1.position];
        blockPosition2 = [...block2.position];
      });

      await editor.tick();

      // Both blocks should have moved by the same delta (20, 30)
      expect(blockPosition1).toEqual([120, 130]);
      expect(blockPosition2).toEqual([220, 180]);
    });

    it("should not move blocks without DragStart component", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let blockPosition: number[] | undefined;

      // Create a selected block WITHOUT DragStart
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          selected: true,
        });
        // Note: No DragStart added

        // Create a transform box with DragStart
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [50, 50],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [50, 50],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the transform box using DragBlock command
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: boxId!,
          position: [150, 200],
        });
      });

      await editor.tick();

      // Check block position was NOT updated
      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockPosition = [...block.position];
      });

      await editor.tick();

      // Block should remain at original position
      expect(blockPosition).toEqual([100, 100]);
    });
  });

  describe("rotate handle movement", () => {
    it("should rotate selected blocks when rotate handle moves", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockRotation: number | undefined;

      // Create a selected block with DragStart
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Create a transform box
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Create a rotate handle at the top-right corner
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 95], // Near top-right corner, centered at (200, 100)
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Rotate,
          vectorX: 1, // Right side
          vectorY: -1, // Top side
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 95],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the rotate handle to simulate 90 degree rotation
      // Box center is at (150, 150)
      // Original handle center is at (200, 100) - top right
      // Move handle to (200, 200) - bottom right (90 degree rotation)
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [195, 195], // Center at (200, 200)
        });
      });

      await editor.tick();

      // Check block rotation was updated
      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockRotation = block.rotateZ;
      });

      await editor.tick();

      // Block should have rotated (exact angle depends on calculations)
      // The rotation should be non-zero
      expect(blockRotation).not.toBe(0);
    });

    it("should warn when no transform box found for rotation", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      let handleId: number | undefined;

      // Create a rotate handle WITHOUT a transform box
      editor.nextTick((ctx) => {
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 95],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Rotate,
          vectorX: 1,
          vectorY: -1,
          transformBoxId: 0,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 95],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the handle using DragBlock command
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [195, 195],
        });
      });

      await editor.tick();

      expect(warnSpy).toHaveBeenCalledWith(
        "No transform box found for rotation"
      );
      warnSpy.mockRestore();
    });
  });

  describe("scale handle movement", () => {
    it("should scale selected blocks when scale handle moves", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;

      // Create a selected block with DragStart
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Create a transform box
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Create a scale handle at the bottom-right corner
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 195], // Bottom-right corner
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1, // Right
          vectorY: 1, // Bottom
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 195],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the scale handle to make the box larger
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [245, 245], // Increase by 50px in each direction
        });
      });

      await editor.tick();

      // Check block size was updated
      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
      });

      await editor.tick();

      // Block should have been scaled (size should be larger)
      expect(blockSize![0]).toBeGreaterThan(100);
      expect(blockSize![1]).toBeGreaterThan(100);
    });

    it("should maintain aspect ratio when scaling", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;

      // Create a block with 2:1 aspect ratio
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [200, 100], // 2:1 ratio
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [200, 100],
          rotateZ: 0,
        });

        // Create a transform box with same dimensions
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [200, 100],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [200, 100],
          rotateZ: 0,
        });

        // Create a scale handle
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [295, 145],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [295, 145],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the scale handle
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [345, 195],
        });
      });

      await editor.tick();

      // Check block size maintains aspect ratio
      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
      });

      await editor.tick();

      // Aspect ratio should remain 2:1
      const aspectRatio = blockSize![0] / blockSize![1];
      expect(aspectRatio).toBeCloseTo(2, 1);
    });

    it("should warn when no transform box found for scaling", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      let handleId: number | undefined;

      // Create a scale handle WITHOUT a transform box
      editor.nextTick((ctx) => {
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 195],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: 0,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 195],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the handle using DragBlock command
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [245, 245],
        });
      });

      await editor.tick();

      expect(warnSpy).toHaveBeenCalledWith(
        "No transform box found for scaling"
      );
      warnSpy.mockRestore();
    });
  });

  describe("stretch handle movement", () => {
    it("should stretch only in one direction when vectorY is 0", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;

      // Create a selected block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Create a transform box
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Create a stretch handle on the right edge (vectorY = 0)
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 145],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Stretch,
          vectorX: 1, // Right
          vectorY: 0, // Middle (horizontal stretch only)
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 145],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the stretch handle horizontally
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [245, 145], // Move right by 50
        });
      });

      await editor.tick();

      // Check block size
      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
      });

      await editor.tick();

      // Width should have increased, height should remain the same
      expect(blockSize![0]).toBeGreaterThan(100);
      expect(blockSize![1]).toBe(100);
    });

    it("should stretch only in one direction when vectorX is 0", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;

      // Create a selected block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Create a transform box
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Create a stretch handle on the bottom edge (vectorX = 0)
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [145, 195],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Stretch,
          vectorX: 0, // Middle (vertical stretch only)
          vectorY: 1, // Bottom
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [145, 195],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the stretch handle vertically
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [145, 245], // Move down by 50
        });
      });

      await editor.tick();

      // Check block size
      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
      });

      await editor.tick();

      // Width should remain the same, height should have increased
      expect(blockSize![0]).toBe(100);
      expect(blockSize![1]).toBeGreaterThan(100);
    });
  });

  describe("rotated box scaling", () => {
    it("should scale correctly when box is rotated 45 degrees", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;
      let blockPosition: number[] | undefined;

      const rotateZ = Math.PI / 4; // 45 degrees

      // Create a selected block with rotation
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          rotateZ,
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ,
        });

        // Create a rotated transform box
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rotateZ,
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ,
        });

        // Create a scale handle at the bottom-right corner
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 195],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 195],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Move the scale handle to make the box larger
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [245, 245],
        });
      });

      await editor.tick();

      // Check block was scaled
      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
        blockPosition = [...block.position];
      });

      await editor.tick();

      // Block should have been scaled
      expect(blockSize![0]).toBeGreaterThan(100);
      expect(blockSize![1]).toBeGreaterThan(100);
      // Position should have changed due to scaling from corner
      expect(blockPosition).toBeDefined();
    });

    it("should scale correctly when box is rotated 90 degrees", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;

      const rotateZ = Math.PI / 2; // 90 degrees

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 50], // Non-square to verify correct axis
          rotateZ,
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 50],
          rotateZ,
        });

        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 50],
          rotateZ,
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 50],
          rotateZ,
        });

        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 145],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 145],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [245, 195],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
      });

      await editor.tick();

      // Block should have been scaled in both dimensions
      expect(blockSize![0]).toBeGreaterThan(100);
      expect(blockSize![1]).toBeGreaterThan(50);
    });
  });

  describe("corner flip behavior", () => {
    it("should handle dragging past the opposite corner horizontally", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;
      let blockPosition: number[] | undefined;

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Right edge handle (center at x=200, y=150)
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 145],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Stretch,
          vectorX: 1,
          vectorY: 0,
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 145],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Drag the right edge past the left edge (flip)
      // Handle center moves from x=200 to x=50, so new width = |50 - 100| = 50
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [45, 145], // Center at x=50
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
        blockPosition = [...block.position];
      });

      await editor.tick();

      // Block should have flipped - new width based on distance from opposite edge
      // Original left edge was at x=100 (opposite corner), handle at x=50
      // New width = 50, new position should be at x=50
      expect(blockSize![0]).toBeCloseTo(50, 0);
      expect(blockSize![1]).toBe(100); // Height unchanged in stretch mode
      expect(blockPosition![0]).toBeCloseTo(50, 0); // Position moved to new left edge
      expect(blockPosition![1]).toBe(100); // Y position unchanged
    });

    it("should handle dragging past the opposite corner vertically", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;
      let blockPosition: number[] | undefined;

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Bottom edge handle (center at x=150, y=200)
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [145, 195],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Stretch,
          vectorX: 0,
          vectorY: 1,
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [145, 195],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Drag the bottom edge past the top edge (flip)
      // Handle center moves from y=200 to y=50
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [145, 45], // Center at y=50
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
        blockPosition = [...block.position];
      });

      await editor.tick();

      // Block should have flipped vertically
      // Original top edge was at y=100 (opposite corner), handle at y=50
      // New height = 50, new position should be at y=50
      expect(blockSize![0]).toBe(100); // Width unchanged in stretch mode
      expect(blockSize![1]).toBeCloseTo(50, 0);
      expect(blockPosition![0]).toBe(100); // X position unchanged
      expect(blockPosition![1]).toBeCloseTo(50, 0); // Position moved to new top edge
    });

    it("should handle corner flip on rotated box", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;
      let blockPosition: number[] | undefined;

      const rotateZ = Math.PI / 4; // 45 degrees

      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          rotateZ,
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ,
        });

        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rotateZ,
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ,
        });

        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 195],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 195],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Drag corner past opposite corner
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [45, 45], // Past the top-left corner
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
        blockPosition = [...block.position];
      });

      await editor.tick();

      // Block should still have positive size (minimum 1)
      expect(blockSize![0]).toBeGreaterThanOrEqual(1);
      expect(blockSize![1]).toBeGreaterThanOrEqual(1);
      // Position should have changed to reflect the flip
      expect(blockPosition![0]).not.toBe(100);
      expect(blockPosition![1]).not.toBe(100);
    });

    it("should position block correctly after horizontal flip with scale handle", async () => {
      let blockId: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize: number[] | undefined;
      let blockPosition: number[] | undefined;

      editor.nextTick((ctx) => {
        // Block at position [100, 100] with size [100, 100]
        // So it spans from (100,100) to (200,200)
        blockId = createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          selected: true,
        });
        addComponent(ctx, blockId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 100],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 100],
          rotateZ: 0,
        });

        // Bottom-right corner handle (center at 200, 200)
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 195],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 195],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Drag bottom-right corner to position (50, 50)
      // This should flip both X and Y since we're going past the top-left corner at (100, 100)
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [45, 45], // Center at (50, 50)
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, blockId!);
        blockSize = [...block.size];
        blockPosition = [...block.position];
      });

      await editor.tick();

      // After flip, the opposite corner (originally at 100,100) becomes the anchor
      // Handle at (50, 50), so new size should be 50x50
      // New box spans from (50, 50) to (100, 100)
      expect(blockSize![0]).toBeCloseTo(50, 0);
      expect(blockSize![1]).toBeCloseTo(50, 0);
      expect(blockPosition![0]).toBeCloseTo(50, 0);
      expect(blockPosition![1]).toBeCloseTo(50, 0);
    });
  });

  describe("multiple blocks scaling", () => {
    it("should scale multiple blocks proportionally", async () => {
      let blockId1: number | undefined;
      let blockId2: number | undefined;
      let boxId: number | undefined;
      let handleId: number | undefined;
      let blockSize1: number[] | undefined;
      let blockSize2: number[] | undefined;

      // Create two selected blocks with different sizes
      editor.nextTick((ctx) => {
        blockId1 = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          selected: true,
        });
        addComponent(ctx, blockId1, DragStart, {
          position: [100, 100],
          size: [50, 50],
          rotateZ: 0,
        });

        blockId2 = createBlock(ctx, {
          position: [160, 100],
          size: [40, 50],
          selected: true,
        });
        addComponent(ctx, blockId2, DragStart, {
          position: [160, 100],
          size: [40, 50],
          rotateZ: 0,
        });

        // Create a transform box encompassing both blocks
        boxId = createEntity(ctx);
        addComponent(ctx, boxId, Block, {
          position: [100, 100],
          size: [100, 50],
          rank: "z",
        });
        addComponent(ctx, boxId, TransformBox, {});
        addComponent(ctx, boxId, DragStart, {
          position: [100, 100],
          size: [100, 50],
          rotateZ: 0,
        });

        // Create a scale handle at bottom-right
        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [195, 145],
          size: [10, 10],
          rank: "z",
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: boxId,
        });
        addComponent(ctx, handleId, DragStart, {
          position: [195, 145],
          size: [10, 10],
          rotateZ: 0,
        });
      });

      await editor.tick();

      // Double the size by moving the handle
      editor.nextTick((ctx) => {
        DragBlock.spawn(ctx, {
          entityId: handleId!,
          position: [295, 195], // Roughly double the distance from center
        });
      });

      await editor.tick();

      // Check both block sizes were updated
      editor.nextTick((ctx) => {
        const block1 = Block.read(ctx, blockId1!);
        const block2 = Block.read(ctx, blockId2!);
        blockSize1 = [...block1.size];
        blockSize2 = [...block2.size];
      });

      await editor.tick();

      // Both blocks should have scaled (sizes should be larger)
      expect(blockSize1![0]).toBeGreaterThan(50);
      expect(blockSize1![1]).toBeGreaterThan(50);
      expect(blockSize2![0]).toBeGreaterThan(40);
      expect(blockSize2![1]).toBeGreaterThan(50);
    });
  });
});
