import { describe, it, expect, afterEach, beforeEach } from "vitest";

import {
  Editor,
  type EditorPlugin,
  type InfiniteCanvasResources,
} from "../../../src";
import { Cursor } from "../../../src/singletons";
import { cursorSystem } from "../../../src/systems/postRender";
import { CursorKind } from "../../../src/types";
import { DEFAULT_CURSOR_DEFS, getCursorSvg } from "../../../src/cursors";
import { PLUGIN_NAME } from "../../../src/constants";
import { createMockElement, createTestResources } from "../../testUtils";

// Mock DOM element for tests
const mockDomElement = createMockElement();

// Test plugin with only PostRenderCursor system and resources
const testPlugin: EditorPlugin<InfiniteCanvasResources> = {
  name: PLUGIN_NAME,
  components: [],
  singletons: [Cursor],
  postRenderSystems: [cursorSystem],
  resources: createTestResources(),
};

describe("PostRenderCursor", () => {
  let editor: Editor;
  let originalBodyCursor: string;

  beforeEach(async () => {
    // Save original cursor
    originalBodyCursor = document.body.style.cursor;
    document.body.style.cursor = "";

    editor = new Editor(mockDomElement, { plugins: [testPlugin] });
    await editor.initialize();
  });

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
    // Restore original cursor
    document.body.style.cursor = originalBodyCursor;
  });

  describe("cursor application", () => {
    it("should apply context cursor to document.body.style.cursor", async () => {
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0);
      });

      await editor.tick();

      const expectedCursor = getCursorSvg(
        DEFAULT_CURSOR_DEFS,
        CursorKind.Drag,
        0
      );
      expect(document.body.style.cursor).toBe(expectedCursor);
    });

    it("should apply base cursor when context cursor is empty", async () => {
      editor.nextTick((ctx) => {
        Cursor.setCursor(ctx, CursorKind.NS, 0);
      });

      await editor.tick();

      const expectedCursor = getCursorSvg(
        DEFAULT_CURSOR_DEFS,
        CursorKind.NS,
        0
      );
      expect(document.body.style.cursor).toBe(expectedCursor);
    });

    it("should use default cursor when both context and base cursor are empty", async () => {
      editor.nextTick((ctx) => {
        const cursor = Cursor.write(ctx);
        cursor.cursorKind = "";
        cursor.contextCursorKind = "";
      });

      await editor.tick();

      expect(document.body.style.cursor).toBe("default");
    });
  });

  describe("cursor priority", () => {
    it("should prioritize context cursor over base cursor", async () => {
      editor.nextTick((ctx) => {
        Cursor.setCursor(ctx, CursorKind.NS, 0);
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0);
      });

      await editor.tick();

      const expectedCursor = getCursorSvg(
        DEFAULT_CURSOR_DEFS,
        CursorKind.Drag,
        0
      );
      expect(document.body.style.cursor).toBe(expectedCursor);
    });

    it("should fall back to base cursor when context cursor is cleared", async () => {
      // First set both
      editor.nextTick((ctx) => {
        Cursor.setCursor(ctx, CursorKind.NS, 0);
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0);
      });

      await editor.tick();
      const dragCursor = getCursorSvg(DEFAULT_CURSOR_DEFS, CursorKind.Drag, 0);
      expect(document.body.style.cursor).toBe(dragCursor);

      // Clear context cursor
      editor.nextTick((ctx) => {
        Cursor.clearContextCursor(ctx);
      });

      await editor.tick();

      const nsCursor = getCursorSvg(DEFAULT_CURSOR_DEFS, CursorKind.NS, 0);
      expect(document.body.style.cursor).toBe(nsCursor);
    });
  });

  describe("change detection", () => {
    it("should only update DOM when cursor singleton changes", async () => {
      // Set initial cursor
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0);
      });

      await editor.tick();
      const dragCursor = getCursorSvg(DEFAULT_CURSOR_DEFS, CursorKind.Drag, 0);
      expect(document.body.style.cursor).toBe(dragCursor);

      // Manually change body cursor to something else
      document.body.style.cursor = "pointer";

      // Tick without changing cursor singleton
      await editor.tick();

      // Cursor should still be "pointer" since singleton didn't change
      expect(document.body.style.cursor).toBe("pointer");
    });

    it("should update DOM when cursor value changes", async () => {
      // Set first cursor
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0);
      });

      await editor.tick();
      const cursor1 = getCursorSvg(DEFAULT_CURSOR_DEFS, CursorKind.Drag, 0);
      expect(document.body.style.cursor).toBe(cursor1);

      // Set second cursor
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.NS, 0);
      });

      await editor.tick();
      const cursor2 = getCursorSvg(DEFAULT_CURSOR_DEFS, CursorKind.NS, 0);
      expect(document.body.style.cursor).toBe(cursor2);
    });
  });

  describe("clearing cursor", () => {
    it("should revert to default when context cursor is cleared and base cursor is empty", async () => {
      // Set cursor
      editor.nextTick((ctx) => {
        Cursor.setContextCursor(ctx, CursorKind.Drag, 0);
      });

      await editor.tick();
      const dragCursor = getCursorSvg(DEFAULT_CURSOR_DEFS, CursorKind.Drag, 0);
      expect(document.body.style.cursor).toBe(dragCursor);

      // Clear cursor
      editor.nextTick((ctx) => {
        Cursor.clearContextCursor(ctx);
      });

      await editor.tick();
      expect(document.body.style.cursor).toBe("default");
    });
  });
});
