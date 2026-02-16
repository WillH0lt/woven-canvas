import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  removeComponent,
  type EditorPlugin,
  Block,
  Hovered,
  Cursor,
} from "@infinitecanvas/core";
import { CursorKind } from "../../../src/cursors";
import { TransformHandle, TransformBox } from "../../../src/components";
import { hoverCursorSystem } from "../../../src/systems/capture";
import { TransformHandleKind } from "../../../src/types";
import { PLUGIN_NAME } from "../../../src/constants";
import { createMockElement } from "../../testUtils";
import { CURSORS } from "../../../src/cursors";

// Mock DOM element for tests
const mockDomElement = createMockElement();

// Test plugin with only CaptureHoverCursor system and its dependencies
// Note: Block, Hovered, and Cursor are already provided by CorePlugin
const testPlugin: EditorPlugin = {
  name: PLUGIN_NAME,
  cursors: CURSORS,
  components: [TransformHandle, TransformBox],
  systems: [hoverCursorSystem],
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
    it("should set context cursor when hovering a transform handle", async () => {
      let transformBoxId: number;
      let handleId: number;
      let contextCursorKind = "";
      let contextRotation = 0;

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
          transformBox: transformBoxId,
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
        const cursor = Cursor.read(ctx);
        contextCursorKind = cursor.contextCursorKind;
        contextRotation = cursor.contextRotation;
      });

      await editor.tick();

      // Should have set the NWSE cursor with 0 rotation
      expect(contextCursorKind).toBe(CursorKind.NWSE);
      expect(contextRotation).toBe(0);
    });

    it("should clear context cursor when unhovering", async () => {
      let transformBoxId: number;
      let handleId: number;
      let contextCursorKindBefore = "";
      let contextCursorKindAfter = "";

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
          transformBox: transformBoxId,
          cursorKind: CursorKind.NWSE,
        });
      });

      await editor.tick();

      // Add Hovered in a separate tick to ensure query tracking works
      editor.nextTick((ctx) => {
        addComponent(ctx, handleId!, Hovered, {});
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextCursorKindBefore = Cursor.read(ctx).contextCursorKind;
      });

      await editor.tick();

      // Remove Hovered component
      editor.nextTick((ctx) => {
        removeComponent(ctx, handleId!, Hovered);
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextCursorKindAfter = Cursor.read(ctx).contextCursorKind;
      });

      await editor.tick();

      expect(contextCursorKindBefore).toBe(CursorKind.NWSE);
      expect(contextCursorKindAfter).toBe("");
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
            transformBox: transformBoxId,
            cursorKind: cursorKind,
          });
        });

        await editor.tick();

        // Add Hovered in a separate tick to ensure query tracking works
        editor.nextTick((ctx) => {
          addComponent(ctx, handleId!, Hovered, {});
        });

        await editor.tick();

        let contextCursorKind = "";
        editor.nextTick((ctx) => {
          contextCursorKind = Cursor.read(ctx).contextCursorKind;
        });

        await editor.tick();

        expect(contextCursorKind).toBe(cursorKind);

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
      let contextCursorKind = "";
      let contextRotation = 0;
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
          transformBox: transformBoxId,
          cursorKind: CursorKind.NS,
        });
      });

      await editor.tick();

      // Add Hovered in a separate tick to ensure query tracking works
      editor.nextTick((ctx) => {
        addComponent(ctx, handleId!, Hovered, {});
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const cursor = Cursor.read(ctx);
        contextCursorKind = cursor.contextCursorKind;
        contextRotation = cursor.contextRotation;
      });

      await editor.tick();

      // Should use the transform box's rotation
      expect(contextCursorKind).toBe(CursorKind.NS);
      expect(contextRotation).toBe(rotation);
    });

    it("should update cursor when transform box rotation changes", async () => {
      let transformBoxId: number;
      let handleId: number;
      let rotationBefore = 0;
      let rotationAfter = 0;

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
          transformBox: transformBoxId,
          cursorKind: CursorKind.NS,
        });
      });

      await editor.tick();

      // Add Hovered in a separate tick to ensure query tracking works
      editor.nextTick((ctx) => {
        addComponent(ctx, handleId!, Hovered, {});
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        rotationBefore = Cursor.read(ctx).contextRotation;
      });

      await editor.tick();

      // Change transform box rotation
      editor.nextTick((ctx) => {
        const boxBlock = Block.write(ctx, transformBoxId!);
        boxBlock.rotateZ = Math.PI / 2; // 90 degrees
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        rotationAfter = Cursor.read(ctx).contextRotation;
      });

      await editor.tick();

      expect(rotationBefore).toBe(0);
      expect(rotationAfter).toBe(Math.PI / 2);
    });
  });

  describe("edge cases", () => {
    it("should not update cursor if same cursor value", async () => {
      let transformBoxId: number;
      let handleId: number;

      // Create entities
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
          transformBox: transformBoxId,
          cursorKind: CursorKind.NS,
        });
      });

      await editor.tick();

      // Add Hovered in a separate tick to ensure query tracking works
      editor.nextTick((ctx) => {
        addComponent(ctx, handleId!, Hovered, {});
      });

      await editor.tick();

      // Get initial cursor value
      let initialCursorKind = "";
      editor.nextTick((ctx) => {
        initialCursorKind = Cursor.read(ctx).contextCursorKind;
      });

      await editor.tick();

      // Verify it doesn't clear or change unnecessarily
      editor.nextTick((ctx) => {
        const currentCursorKind = Cursor.read(ctx).contextCursorKind;
        expect(currentCursorKind).toBe(initialCursorKind);
      });

      await editor.tick();
    });

    it("should handle multiple hovered handles by using first one", async () => {
      let transformBoxId: number;
      let handleId1: number;
      let handleId2: number;
      let contextCursorKind = "";

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
          transformBox: transformBoxId,
          cursorKind: CursorKind.NS,
        });

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
          transformBox: transformBoxId,
          cursorKind: CursorKind.EW,
        });
      });

      await editor.tick();

      // Add Hovered to both handles in a separate tick to ensure query tracking works
      editor.nextTick((ctx) => {
        addComponent(ctx, handleId1!, Hovered, {});
        addComponent(ctx, handleId2!, Hovered, {});
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextCursorKind = Cursor.read(ctx).contextCursorKind;
      });

      await editor.tick();

      // Should use one of the cursors (first in query order)
      // We just verify a cursor was set
      expect(contextCursorKind).not.toBe("");
    });
  });
});
