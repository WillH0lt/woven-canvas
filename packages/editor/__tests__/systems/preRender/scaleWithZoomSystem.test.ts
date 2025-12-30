import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  type EditorPlugin,
  Camera,
  EditorComponentDef,
  EditorSingletonDef,
} from "../../../src";
import * as components from "../../../src/components";
import * as singletons from "../../../src/singletons";
import { Block, ScaleWithZoom } from "../../../src/components";
import { ScaleWithZoomState } from "../../../src/singletons";
import { scaleWithZoomSystem } from "../../../src/systems/preRender";
import { createMockElement } from "../../testUtils";
import { PLUGIN_NAME } from "../../../src/constants";

// Mock DOM element for tests
const mockDomElement = createMockElement();

// Test plugin with only PreRenderScaleWithZoom system and its dependencies
const testPlugin: EditorPlugin = {
  name: PLUGIN_NAME,
  components: Object.values(components).filter(
    (v): v is EditorComponentDef<any> => v instanceof EditorComponentDef
  ),
  singletons: Object.values(singletons).filter(
    (v): v is EditorSingletonDef<any> => v instanceof EditorSingletonDef
  ),
  preRenderSystems: [scaleWithZoomSystem],
};

describe("PreRenderScaleWithZoom", () => {
  let editor: Editor;

  beforeEach(async () => {
    editor = new Editor(mockDomElement, {
      plugins: [testPlugin],
      excludeCorePlugin: true,
    });
    await editor.initialize();
  });

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
  });

  describe("initial scaling", () => {
    it("should scale newly added ScaleWithZoom entities at current zoom", async () => {
      let entityId: number;
      let blockSize: [number, number] = [0, 0];

      // Set zoom to 2
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 2;
      });

      await editor.tick();

      // Create entity with ScaleWithZoom
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockSize = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // At zoom 2, size should be halved (1/zoom)
      expect(blockSize[0]).toBeCloseTo(10);
      expect(blockSize[1]).toBeCloseTo(10);
    });

    it("should scale entity at zoom 1 with no change", async () => {
      let entityId: number;
      let blockSize: [number, number] = [0, 0];

      // Create entity with ScaleWithZoom at default zoom 1
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockSize = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // At zoom 1, size should be unchanged
      expect(blockSize[0]).toBeCloseTo(20);
      expect(blockSize[1]).toBeCloseTo(20);
    });
  });

  describe("zoom change response", () => {
    it("should scale entity when zoom increases", async () => {
      let entityId: number;
      let blockSizeBefore: [number, number] = [0, 0];
      let blockSizeAfter: [number, number] = [0, 0];

      // Create entity at zoom 1
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockSizeBefore = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // Increase zoom to 4
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 4;
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockSizeAfter = [block.size[0], block.size[1]];
      });

      await editor.tick();

      expect(blockSizeBefore[0]).toBeCloseTo(20);
      // At zoom 4, size should be 1/4 of start size
      expect(blockSizeAfter[0]).toBeCloseTo(5);
      expect(blockSizeAfter[1]).toBeCloseTo(5);
    });

    it("should scale entity when zoom decreases", async () => {
      let entityId: number;
      let blockSizeAfter: [number, number] = [0, 0];

      // Create entity at zoom 1
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5],
        });
      });

      await editor.tick();

      // Decrease zoom to 0.5
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 0.5;
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockSizeAfter = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // At zoom 0.5, size should be 2x start size (1/0.5 = 2)
      expect(blockSizeAfter[0]).toBeCloseTo(40);
      expect(blockSizeAfter[1]).toBeCloseTo(40);
    });

    it("should update all ScaleWithZoom entities when zoom changes", async () => {
      let entity1Id: number;
      let entity2Id: number;
      let block1Size: [number, number] = [0, 0];
      let block2Size: [number, number] = [0, 0];

      // Create two entities
      editor.nextTick((ctx) => {
        entity1Id = createEntity(ctx);
        addComponent(ctx, entity1Id, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entity1Id, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5],
        });

        entity2Id = createEntity(ctx);
        addComponent(ctx, entity2Id, Block, {
          position: [200, 200],
          size: [40, 40],
        });
        addComponent(ctx, entity2Id, ScaleWithZoom, {
          startPosition: [200, 200],
          startSize: [40, 40],
          anchor: [0.5, 0.5],
        });
      });

      await editor.tick();

      // Change zoom to 2
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 2;
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block1 = Block.read(ctx, entity1Id!);
        const block2 = Block.read(ctx, entity2Id!);
        block1Size = [block1.size[0], block1.size[1]];
        block2Size = [block2.size[0], block2.size[1]];
      });

      await editor.tick();

      // Both should be scaled to 1/2
      expect(block1Size[0]).toBeCloseTo(10);
      expect(block1Size[1]).toBeCloseTo(10);
      expect(block2Size[0]).toBeCloseTo(20);
      expect(block2Size[1]).toBeCloseTo(20);
    });
  });

  describe("anchor point behavior", () => {
    it("should scale around center anchor by default", async () => {
      let entityId: number;
      let blockPosition: [number, number] = [0, 0];

      // Create at zoom 1, then zoom in
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5], // center anchor
        });
      });

      await editor.tick();

      // Zoom to 2
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 2;
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockPosition = [block.position[0], block.position[1]];
      });

      await editor.tick();

      // With center anchor, position should shift by (startSize - scaledSize) * 0.5
      // startSize = 20, scaledSize = 10, shift = 10 * 0.5 = 5
      expect(blockPosition[0]).toBeCloseTo(105);
      expect(blockPosition[1]).toBeCloseTo(105);
    });

    it("should scale around top-left anchor (0, 0)", async () => {
      let entityId: number;
      let blockPosition: [number, number] = [0, 0];

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0, 0], // top-left anchor
        });
      });

      await editor.tick();

      // Zoom to 2
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 2;
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockPosition = [block.position[0], block.position[1]];
      });

      await editor.tick();

      // With top-left anchor (0, 0), position should not shift
      expect(blockPosition[0]).toBeCloseTo(100);
      expect(blockPosition[1]).toBeCloseTo(100);
    });

    it("should scale around bottom-right anchor (1, 1)", async () => {
      let entityId: number;
      let blockPosition: [number, number] = [0, 0];

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [1, 1], // bottom-right anchor
        });
      });

      await editor.tick();

      // Zoom to 2
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 2;
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockPosition = [block.position[0], block.position[1]];
      });

      await editor.tick();

      // With bottom-right anchor (1, 1), position should shift by full difference
      // startSize = 20, scaledSize = 10, shift = 10 * 1 = 10
      expect(blockPosition[0]).toBeCloseTo(110);
      expect(blockPosition[1]).toBeCloseTo(110);
    });
  });

  describe("state tracking", () => {
    it("should track lastZoom in ScaleWithZoomState", async () => {
      let lastZoom = 0;

      // Initial state should be zoom 1
      editor.nextTick((ctx) => {
        lastZoom = ScaleWithZoomState.read(ctx).lastZoom;
      });

      await editor.tick();

      expect(lastZoom).toBe(1);

      // Create an entity and change zoom
      editor.nextTick((ctx) => {
        const entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [10, 10],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [0, 0],
          startSize: [10, 10],
          anchor: [0.5, 0.5],
        });

        const camera = Camera.write(ctx);
        camera.zoom = 3;
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        lastZoom = ScaleWithZoomState.read(ctx).lastZoom;
      });

      await editor.tick();

      expect(lastZoom).toBe(3);
    });

    it("should not re-scale entities if zoom has not changed", async () => {
      let entityId: number;
      let initialSize: [number, number] = [0, 0];
      let laterSize: [number, number] = [0, 0];

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        initialSize = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // Tick a few more times without changing zoom
      await editor.tick();
      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        laterSize = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // Size should remain the same
      expect(laterSize[0]).toBeCloseTo(initialSize[0]);
      expect(laterSize[1]).toBeCloseTo(initialSize[1]);
    });
  });

  describe("component changes", () => {
    it("should scale entity when ScaleWithZoom is added", async () => {
      let entityId: number;
      let blockSizeBefore: [number, number] = [0, 0];
      let blockSizeAfter: [number, number] = [0, 0];

      // Set zoom first
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 2;
      });

      await editor.tick();

      // Create entity without ScaleWithZoom
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockSizeBefore = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // Add ScaleWithZoom
      editor.nextTick((ctx) => {
        addComponent(ctx, entityId!, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5],
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockSizeAfter = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // Before adding component, size should be unchanged
      expect(blockSizeBefore[0]).toBeCloseTo(20);
      // After adding component, should be scaled
      expect(blockSizeAfter[0]).toBeCloseTo(10);
    });

    it("should scale entity when ScaleWithZoom values change", async () => {
      let entityId: number;
      let blockSizeAfter: [number, number] = [0, 0];

      // Set zoom to 2
      editor.nextTick((ctx) => {
        const camera = Camera.write(ctx);
        camera.zoom = 2;
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [100, 100],
          size: [20, 20],
        });
        addComponent(ctx, entityId, ScaleWithZoom, {
          startPosition: [100, 100],
          startSize: [20, 20],
          anchor: [0.5, 0.5],
        });
      });

      await editor.tick();

      // Update ScaleWithZoom startSize
      editor.nextTick((ctx) => {
        const swz = ScaleWithZoom.write(ctx, entityId!);
        swz.startSize = [40, 40];
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        blockSizeAfter = [block.size[0], block.size[1]];
      });

      await editor.tick();

      // New startSize 40 at zoom 2 should be 20
      expect(blockSizeAfter[0]).toBeCloseTo(20);
      expect(blockSizeAfter[1]).toBeCloseTo(20);
    });
  });
});
