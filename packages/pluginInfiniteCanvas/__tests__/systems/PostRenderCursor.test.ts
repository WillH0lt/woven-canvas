import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { Editor, type EditorPlugin } from "@infinitecanvas/editor";
import { Cursor } from "../../src/singletons";
import { PostRenderCursor } from "../../src/systems/PostRenderCursor";
import { createMockElement } from "../testUtils";

// Mock DOM element for tests
const mockDomElement = createMockElement();

// Test plugin with only PostRenderCursor system
const testPlugin: EditorPlugin = {
  name: "test",
  components: [],
  singletons: [Cursor],
  postRenderSystems: [PostRenderCursor],
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
    it("should apply contextSvg to document.body.style.cursor", async () => {
      const testCursor = "url(data:image/svg+xml,...) 12 12, auto";

      editor.nextTick((ctx) => {
        Cursor.setContextSvg(ctx, testCursor);
      });

      await editor.tick();

      expect(document.body.style.cursor).toBe(testCursor);
    });

    it("should apply svg when contextSvg is empty", async () => {
      const testCursor = "url(data:image/svg+xml,...) 12 12, auto";

      editor.nextTick((ctx) => {
        const cursor = Cursor.write(ctx);
        cursor.svg = testCursor;
        cursor.contextSvg = "";
      });

      await editor.tick();

      expect(document.body.style.cursor).toBe(testCursor);
    });

    it("should use default cursor when both contextSvg and svg are empty", async () => {
      editor.nextTick((ctx) => {
        const cursor = Cursor.write(ctx);
        cursor.svg = "";
        cursor.contextSvg = "";
      });

      await editor.tick();

      expect(document.body.style.cursor).toBe("default");
    });
  });

  describe("cursor priority", () => {
    it("should prioritize contextSvg over svg", async () => {
      const contextCursor = "url(context-cursor) 12 12, auto";
      const svgCursor = "url(svg-cursor) 12 12, auto";

      editor.nextTick((ctx) => {
        const cursor = Cursor.write(ctx);
        cursor.contextSvg = contextCursor;
        cursor.svg = svgCursor;
      });

      await editor.tick();

      expect(document.body.style.cursor).toBe(contextCursor);
    });

    it("should fall back to svg when contextSvg is cleared", async () => {
      const contextCursor = "url(context-cursor) 12 12, auto";
      const svgCursor = "url(svg-cursor) 12 12, auto";

      // First set both
      editor.nextTick((ctx) => {
        const cursor = Cursor.write(ctx);
        cursor.contextSvg = contextCursor;
        cursor.svg = svgCursor;
      });

      await editor.tick();
      expect(document.body.style.cursor).toBe(contextCursor);

      // Clear contextSvg
      editor.nextTick((ctx) => {
        Cursor.clearContextSvg(ctx);
      });

      await editor.tick();

      expect(document.body.style.cursor).toBe(svgCursor);
    });
  });

  describe("change detection", () => {
    it("should only update DOM when cursor singleton changes", async () => {
      const testCursor = "url(test-cursor) 12 12, auto";

      // Set initial cursor
      editor.nextTick((ctx) => {
        Cursor.setContextSvg(ctx, testCursor);
      });

      await editor.tick();
      expect(document.body.style.cursor).toBe(testCursor);

      // Manually change body cursor to something else
      document.body.style.cursor = "pointer";

      // Tick without changing cursor singleton
      await editor.tick();

      // Cursor should still be "pointer" since singleton didn't change
      expect(document.body.style.cursor).toBe("pointer");
    });

    it("should update DOM when cursor value changes", async () => {
      const cursor1 = "url(cursor-1) 12 12, auto";
      const cursor2 = "url(cursor-2) 12 12, auto";

      // Set first cursor
      editor.nextTick((ctx) => {
        Cursor.setContextSvg(ctx, cursor1);
      });

      await editor.tick();
      expect(document.body.style.cursor).toBe(cursor1);

      // Set second cursor
      editor.nextTick((ctx) => {
        Cursor.setContextSvg(ctx, cursor2);
      });

      await editor.tick();
      expect(document.body.style.cursor).toBe(cursor2);
    });
  });

  describe("clearing cursor", () => {
    it("should revert to default when contextSvg is cleared and svg is empty", async () => {
      const testCursor = "url(test-cursor) 12 12, auto";

      // Set cursor
      editor.nextTick((ctx) => {
        Cursor.setContextSvg(ctx, testCursor);
      });

      await editor.tick();
      expect(document.body.style.cursor).toBe(testCursor);

      // Clear cursor
      editor.nextTick((ctx) => {
        Cursor.clearContextSvg(ctx);
      });

      await editor.tick();
      expect(document.body.style.cursor).toBe("default");
    });
  });
});
