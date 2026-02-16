import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  type EditorPlugin,
  Aabb,
  Block,
} from "../../src";

// Mock DOM element for tests
const mockDomElement = document.createElement("div");

// Minimal plugin that registers Aabb and Block components
const TestPlugin: EditorPlugin = {
  name: "test",
  components: [Aabb, Block],
};

describe("Aabb", () => {
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

  describe("containsPoint", () => {
    it("should return true when point is inside AABB (inclusive)", async () => {
      let result: boolean | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0; // left
        value[1] = 0; // top
        value[2] = 100; // right
        value[3] = 100; // bottom

        result = Aabb.containsPoint(ctx, eid, [50, 50]);
      });

      await editor.tick();
      expect(result).toBe(true);
    });

    it("should return true when point is on edge (inclusive)", async () => {
      let result: boolean | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0;
        value[1] = 0;
        value[2] = 100;
        value[3] = 100;

        result = Aabb.containsPoint(ctx, eid, [100, 100], true);
      });

      await editor.tick();
      expect(result).toBe(true);
    });

    it("should return false when point is on edge (exclusive)", async () => {
      let result: boolean | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0;
        value[1] = 0;
        value[2] = 100;
        value[3] = 100;

        result = Aabb.containsPoint(ctx, eid, [100, 100], false);
      });

      await editor.tick();
      expect(result).toBe(false);
    });

    it("should return false when point is outside", async () => {
      let result: boolean | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0;
        value[1] = 0;
        value[2] = 100;
        value[3] = 100;

        result = Aabb.containsPoint(ctx, eid, [150, 150]);
      });

      await editor.tick();
      expect(result).toBe(false);
    });
  });

  describe("expandByPoint", () => {
    it("should expand AABB to include point outside bounds", async () => {
      let bounds: number[] | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 10;
        value[1] = 10;
        value[2] = 20;
        value[3] = 20;

        Aabb.expandByPoint(ctx, eid, [0, 0]);
        Aabb.expandByPoint(ctx, eid, [30, 30]);

        bounds = [...Aabb.read(ctx, eid).value];
      });

      await editor.tick();
      expect(bounds).toEqual([0, 0, 30, 30]);
    });

    it("should not change AABB when point is inside", async () => {
      let bounds: number[] | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0;
        value[1] = 0;
        value[2] = 100;
        value[3] = 100;

        Aabb.expandByPoint(ctx, eid, [50, 50]);

        bounds = [...Aabb.read(ctx, eid).value];
      });

      await editor.tick();
      expect(bounds).toEqual([0, 0, 100, 100]);
    });
  });

  describe("expandByAabb", () => {
    it("should expand AABB to include another AABB", async () => {
      let bounds: number[] | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 10;
        value[1] = 10;
        value[2] = 20;
        value[3] = 20;

        Aabb.expandByAabb(ctx, eid, [-5, -5, 25, 25]);

        bounds = [...Aabb.read(ctx, eid).value];
      });

      await editor.tick();
      expect(bounds).toEqual([-5, -5, 25, 25]);
    });
  });

  describe("copyFrom", () => {
    it("should copy bounds from another entity", async () => {
      let bounds: number[] | undefined;

      editor.nextTick((ctx) => {
        const eid1 = createEntity(ctx);
        addComponent(ctx, eid1, Aabb);
        const { value: v1 } = Aabb.write(ctx, eid1);
        v1[0] = 10;
        v1[1] = 20;
        v1[2] = 30;
        v1[3] = 40;

        const eid2 = createEntity(ctx);
        addComponent(ctx, eid2, Aabb);

        Aabb.copyFrom(ctx, eid2, eid1);

        bounds = [...Aabb.read(ctx, eid2).value];
      });

      await editor.tick();
      expect(bounds).toEqual([10, 20, 30, 40]);
    });
  });

  describe("setByPoints", () => {
    it("should compute AABB from array of points", async () => {
      let bounds: number[] | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);

        Aabb.setByPoints(ctx, eid, [
          [10, 20],
          [30, 5],
          [15, 40],
          [0, 25],
        ]);

        bounds = [...Aabb.read(ctx, eid).value];
      });

      await editor.tick();
      expect(bounds).toEqual([0, 5, 30, 40]);
    });

    it("should not modify AABB when given empty array", async () => {
      let bounds: number[] | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 1;
        value[1] = 2;
        value[2] = 3;
        value[3] = 4;

        Aabb.setByPoints(ctx, eid, []);

        bounds = [...Aabb.read(ctx, eid).value];
      });

      await editor.tick();
      expect(bounds).toEqual([1, 2, 3, 4]);
    });
  });

  describe("getCenter", () => {
    it("should return center point of AABB", async () => {
      let center: [number, number] | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0;
        value[1] = 0;
        value[2] = 100;
        value[3] = 50;

        center = Aabb.getCenter(ctx, eid);
      });

      await editor.tick();
      expect(center).toEqual([50, 25]);
    });
  });

  describe("getWidth/getHeight", () => {
    it("should return correct dimensions", async () => {
      let width: number | undefined;
      let height: number | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 10;
        value[1] = 20;
        value[2] = 60;
        value[3] = 100;

        width = Aabb.getWidth(ctx, eid);
        height = Aabb.getHeight(ctx, eid);
      });

      await editor.tick();
      expect(width).toBe(50);
      expect(height).toBe(80);
    });
  });

  describe("distanceToPoint", () => {
    it("should return 0 when point is inside", async () => {
      let distance: number | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0;
        value[1] = 0;
        value[2] = 100;
        value[3] = 100;

        distance = Aabb.distanceToPoint(ctx, eid, [50, 50]);
      });

      await editor.tick();
      expect(distance).toBe(0);
    });

    it("should return correct distance when point is outside", async () => {
      let distance: number | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0;
        value[1] = 0;
        value[2] = 100;
        value[3] = 100;

        // Point at (103, 104) - distance from corner (100, 100)
        distance = Aabb.distanceToPoint(ctx, eid, [103, 104]);
      });

      await editor.tick();
      expect(distance).toBe(5); // sqrt(3^2 + 4^2) = 5
    });
  });

  describe("intersectsEntity", () => {
    it("should return true when AABBs overlap", async () => {
      let result: boolean | undefined;

      editor.nextTick((ctx) => {
        const eid1 = createEntity(ctx);
        addComponent(ctx, eid1, Aabb);
        const { value: v1 } = Aabb.write(ctx, eid1);
        v1[0] = 0;
        v1[1] = 0;
        v1[2] = 100;
        v1[3] = 100;

        const eid2 = createEntity(ctx);
        addComponent(ctx, eid2, Aabb);
        const { value: v2 } = Aabb.write(ctx, eid2);
        v2[0] = 50;
        v2[1] = 50;
        v2[2] = 150;
        v2[3] = 150;

        result = Aabb.intersectsEntity(ctx, eid1, eid2);
      });

      await editor.tick();
      expect(result).toBe(true);
    });

    it("should return false when AABBs do not overlap", async () => {
      let result: boolean | undefined;

      editor.nextTick((ctx) => {
        const eid1 = createEntity(ctx);
        addComponent(ctx, eid1, Aabb);
        const { value: v1 } = Aabb.write(ctx, eid1);
        v1[0] = 0;
        v1[1] = 0;
        v1[2] = 100;
        v1[3] = 100;

        const eid2 = createEntity(ctx);
        addComponent(ctx, eid2, Aabb);
        const { value: v2 } = Aabb.write(ctx, eid2);
        v2[0] = 200;
        v2[1] = 200;
        v2[2] = 300;
        v2[3] = 300;

        result = Aabb.intersectsEntity(ctx, eid1, eid2);
      });

      await editor.tick();
      expect(result).toBe(false);
    });
  });

  describe("surroundsEntity", () => {
    it("should return true when first AABB contains second", async () => {
      let result: boolean | undefined;

      editor.nextTick((ctx) => {
        const outer = createEntity(ctx);
        addComponent(ctx, outer, Aabb);
        const { value: v1 } = Aabb.write(ctx, outer);
        v1[0] = 0;
        v1[1] = 0;
        v1[2] = 100;
        v1[3] = 100;

        const inner = createEntity(ctx);
        addComponent(ctx, inner, Aabb);
        const { value: v2 } = Aabb.write(ctx, inner);
        v2[0] = 25;
        v2[1] = 25;
        v2[2] = 75;
        v2[3] = 75;

        result = Aabb.surroundsEntity(ctx, outer, inner);
      });

      await editor.tick();
      expect(result).toBe(true);
    });

    it("should return false when first AABB does not fully contain second", async () => {
      let result: boolean | undefined;

      editor.nextTick((ctx) => {
        const eid1 = createEntity(ctx);
        addComponent(ctx, eid1, Aabb);
        const { value: v1 } = Aabb.write(ctx, eid1);
        v1[0] = 0;
        v1[1] = 0;
        v1[2] = 100;
        v1[3] = 100;

        const eid2 = createEntity(ctx);
        addComponent(ctx, eid2, Aabb);
        const { value: v2 } = Aabb.write(ctx, eid2);
        v2[0] = 50;
        v2[1] = 50;
        v2[2] = 150;
        v2[3] = 150;

        result = Aabb.surroundsEntity(ctx, eid1, eid2);
      });

      await editor.tick();
      expect(result).toBe(false);
    });
  });

  describe("getCorners", () => {
    it("should return four corner points", async () => {
      let corners:
        | [
            [number, number],
            [number, number],
            [number, number],
            [number, number]
          ]
        | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 10;
        value[1] = 20;
        value[2] = 30;
        value[3] = 40;

        corners = Aabb.getCorners(ctx, eid);
      });

      await editor.tick();
      expect(corners).toEqual([
        [10, 20], // top-left
        [30, 20], // top-right
        [30, 40], // bottom-right
        [10, 40], // bottom-left
      ]);
    });
  });

  describe("applyPadding", () => {
    it("should expand AABB by padding amount", async () => {
      let bounds: number[] | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 10;
        value[1] = 10;
        value[2] = 20;
        value[3] = 20;

        Aabb.applyPadding(ctx, eid, 5);

        bounds = [...Aabb.read(ctx, eid).value];
      });

      await editor.tick();
      expect(bounds).toEqual([5, 5, 25, 25]);
    });

    it("should shrink AABB with negative padding", async () => {
      let bounds: number[] | undefined;

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, Aabb);
        const { value } = Aabb.write(ctx, eid);
        value[0] = 0;
        value[1] = 0;
        value[2] = 100;
        value[3] = 100;

        Aabb.applyPadding(ctx, eid, -10);

        bounds = [...Aabb.read(ctx, eid).value];
      });

      await editor.tick();
      expect(bounds).toEqual([10, 10, 90, 90]);
    });
  });
});
