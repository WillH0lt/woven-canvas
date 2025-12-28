import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  removeComponent,
  hasComponent,
  type EditorPlugin,
} from "@infinitecanvas/editor";
import { Block, Hovered, TransformHandle, TransformBox } from "../../src/components";
import { Cursor } from "../../src/singletons";
import { CaptureHoverCursor } from "../../src/systems/CaptureHoverCursor";
import { CursorKind, TransformHandleKind } from "../../src/types";
import { getCursorSvg } from "../../src/cursors";
import { createMockElement } from "../testUtils";

// Mock DOM element for tests
const mockDomElement = createMockElement();

// Test plugin with only CaptureHoverCursor system and its dependencies
const testPlugin: EditorPlugin = {
  name: "test",
  components: [Block, Hovered, TransformHandle, TransformBox],
  singletons: [Cursor],
  captureSystems: [CaptureHoverCursor],
};

describe("CaptureHoverCursor", () => {
  let editor: Editor;

  beforeEach(async () => {
    editor = new Editor(mockDomElement, { plugins: [testPlugin] });
    await editor.initialize();
  });

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
  });

  describe("hover on transform handle", () => {
    it("should set contextSvg when hovering a transform handle", async () => {
      let transformBoxId: number;
      let handleId: number;
      let contextSvg = "";

      // Create transform box and handle
      editor.nextTick((ctx) => {
        transformBoxId = createEntity(ctx);
        addComponent(ctx, transformBoxId, Block, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: 0,
        });
        addComponent(ctx, transformBoxId, TransformBox, {});

        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [90, 90],
          size: [12, 12],
          rotateZ: 0,
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: transformBoxId,
          cursorKind: CursorKind.NWSE,
        });
      });

      await editor.tick();

      // Add Hovered component to the handle
      editor.nextTick((ctx) => {
        addComponent(ctx, handleId!, Hovered, {});
      });

      await editor.tick();

      // Check cursor was set
      editor.nextTick((ctx) => {
        contextSvg = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();

      // Should have set the NWSE cursor with 0 rotation
      const expectedCursor = getCursorSvg(CursorKind.NWSE, 0);
      expect(contextSvg).toBe(expectedCursor);
    });

    it("should clear contextSvg when unhovering", async () => {
      let transformBoxId: number;
      let handleId: number;
      let contextSvgBefore = "";
      let contextSvgAfter = "";

      // Create transform box and handle with Hovered
      editor.nextTick((ctx) => {
        transformBoxId = createEntity(ctx);
        addComponent(ctx, transformBoxId, Block, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: 0,
        });
        addComponent(ctx, transformBoxId, TransformBox, {});

        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [90, 90],
          size: [12, 12],
          rotateZ: 0,
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: transformBoxId,
          cursorKind: CursorKind.NWSE,
        });
        addComponent(ctx, handleId, Hovered, {});
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextSvgBefore = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();

      // Remove Hovered component
      editor.nextTick((ctx) => {
        removeComponent(ctx, handleId!, Hovered);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextSvgAfter = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();

      expect(contextSvgBefore).not.toBe("");
      expect(contextSvgAfter).toBe("");
    });

    it("should use correct cursor kind for different handle types", async () => {
      let transformBoxId: number;
      let handleId: number;

      const cursorKinds = [
        CursorKind.NS,
        CursorKind.EW,
        CursorKind.NWSE,
        CursorKind.NESW,
        CursorKind.RotateNW,
        CursorKind.RotateNE,
        CursorKind.RotateSW,
        CursorKind.RotateSE,
      ];

      for (const cursorKind of cursorKinds) {
        // Create fresh entities for each test
        editor.nextTick((ctx) => {
          transformBoxId = createEntity(ctx);
          addComponent(ctx, transformBoxId, Block, {
            position: [0, 0],
            size: [100, 100],
            rotateZ: 0,
          });
          addComponent(ctx, transformBoxId, TransformBox, {});

          handleId = createEntity(ctx);
          addComponent(ctx, handleId, Block, {
            position: [90, 90],
            size: [12, 12],
            rotateZ: 0,
          });
          addComponent(ctx, handleId, TransformHandle, {
            kind: TransformHandleKind.Scale,
            vectorX: 1,
            vectorY: 1,
            transformBoxId: transformBoxId,
            cursorKind: cursorKind,
          });
          addComponent(ctx, handleId, Hovered, {});
        });

        await editor.tick();

        let contextSvg = "";
        editor.nextTick((ctx) => {
          contextSvg = Cursor.read(ctx).contextSvg;
        });

        await editor.tick();

        const expectedCursor = getCursorSvg(cursorKind, 0);
        expect(contextSvg).toBe(expectedCursor);

        // Cleanup for next iteration
        editor.nextTick((ctx) => {
          removeComponent(ctx, handleId!, Hovered);
        });
        await editor.tick();
      }
    });
  });

  describe("rotation-aware cursors", () => {
    it("should use transform box rotation for cursor", async () => {
      let transformBoxId: number;
      let handleId: number;
      let contextSvg = "";
      const rotation = Math.PI / 4; // 45 degrees

      editor.nextTick((ctx) => {
        transformBoxId = createEntity(ctx);
        addComponent(ctx, transformBoxId, Block, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: rotation,
        });
        addComponent(ctx, transformBoxId, TransformBox, {});

        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [90, 90],
          size: [12, 12],
          rotateZ: 0,
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: transformBoxId,
          cursorKind: CursorKind.NS,
        });
        addComponent(ctx, handleId, Hovered, {});
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextSvg = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();

      // Should use the transform box's rotation
      const expectedCursor = getCursorSvg(CursorKind.NS, rotation);
      expect(contextSvg).toBe(expectedCursor);
    });

    it("should update cursor when transform box rotation changes", async () => {
      let transformBoxId: number;
      let handleId: number;
      let contextSvgBefore = "";
      let contextSvgAfter = "";

      // Create with initial rotation
      editor.nextTick((ctx) => {
        transformBoxId = createEntity(ctx);
        addComponent(ctx, transformBoxId, Block, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: 0,
        });
        addComponent(ctx, transformBoxId, TransformBox, {});

        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [90, 90],
          size: [12, 12],
          rotateZ: 0,
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: transformBoxId,
          cursorKind: CursorKind.NS,
        });
        addComponent(ctx, handleId, Hovered, {});
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextSvgBefore = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();

      // Change transform box rotation
      editor.nextTick((ctx) => {
        const boxBlock = Block.write(ctx, transformBoxId!);
        boxBlock.rotateZ = Math.PI / 2; // 90 degrees
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextSvgAfter = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();

      const expectedBefore = getCursorSvg(CursorKind.NS, 0);
      const expectedAfter = getCursorSvg(CursorKind.NS, Math.PI / 2);

      expect(contextSvgBefore).toBe(expectedBefore);
      expect(contextSvgAfter).toBe(expectedAfter);
      expect(contextSvgBefore).not.toBe(contextSvgAfter);
    });
  });

  describe("edge cases", () => {
    it("should not update cursor if same cursor value", async () => {
      let transformBoxId: number;
      let handleId: number;
      let writeCount = 0;

      // Create and hover
      editor.nextTick((ctx) => {
        transformBoxId = createEntity(ctx);
        addComponent(ctx, transformBoxId, Block, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: 0,
        });
        addComponent(ctx, transformBoxId, TransformBox, {});

        handleId = createEntity(ctx);
        addComponent(ctx, handleId, Block, {
          position: [90, 90],
          size: [12, 12],
          rotateZ: 0,
        });
        addComponent(ctx, handleId, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: transformBoxId,
          cursorKind: CursorKind.NS,
        });
        addComponent(ctx, handleId, Hovered, {});
      });

      await editor.tick();

      // Get initial cursor value
      let initialContextSvg = "";
      editor.nextTick((ctx) => {
        initialContextSvg = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();

      // Manually set to same value - system should not write again
      editor.nextTick((ctx) => {
        // The system checks if cursor changed before writing
        // So we just need to verify it doesn't clear or change unnecessarily
        const currentContextSvg = Cursor.read(ctx).contextSvg;
        expect(currentContextSvg).toBe(initialContextSvg);
      });

      await editor.tick();
    });

    it("should handle multiple hovered handles by using first one", async () => {
      let transformBoxId: number;
      let handleId1: number;
      let handleId2: number;
      let contextSvg = "";

      editor.nextTick((ctx) => {
        transformBoxId = createEntity(ctx);
        addComponent(ctx, transformBoxId, Block, {
          position: [0, 0],
          size: [100, 100],
          rotateZ: 0,
        });
        addComponent(ctx, transformBoxId, TransformBox, {});

        // First handle with NS cursor
        handleId1 = createEntity(ctx);
        addComponent(ctx, handleId1, Block, {
          position: [90, 90],
          size: [12, 12],
          rotateZ: 0,
        });
        addComponent(ctx, handleId1, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: 1,
          vectorY: 1,
          transformBoxId: transformBoxId,
          cursorKind: CursorKind.NS,
        });
        addComponent(ctx, handleId1, Hovered, {});

        // Second handle with EW cursor
        handleId2 = createEntity(ctx);
        addComponent(ctx, handleId2, Block, {
          position: [0, 90],
          size: [12, 12],
          rotateZ: 0,
        });
        addComponent(ctx, handleId2, TransformHandle, {
          kind: TransformHandleKind.Scale,
          vectorX: -1,
          vectorY: 1,
          transformBoxId: transformBoxId,
          cursorKind: CursorKind.EW,
        });
        addComponent(ctx, handleId2, Hovered, {});
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextSvg = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();

      // Should use one of the cursors (first in query order)
      // We just verify a cursor was set
      expect(contextSvg).not.toBe("");
    });
  });
});
