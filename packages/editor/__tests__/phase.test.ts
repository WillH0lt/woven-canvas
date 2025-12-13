import { describe, it, expect, vi, afterEach } from "vitest";
import {
  Editor,
  defineEditorSystem,
  type EditorPlugin,
} from "../src";

// Mock DOM element for tests
const mockDomElement = document.createElement("div");

describe("System Phases", () => {
  let editor: Editor;

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
  });

  describe("Phase execution order", () => {
    it("should execute phases in order: input, capture, update, render", async () => {
      const executionOrder: string[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        inputSystems: [
          defineEditorSystem(() => {
            executionOrder.push("input");
          }),
        ],
        captureSystems: [
          defineEditorSystem(() => {
            executionOrder.push("capture");
          }),
        ],
        updateSystems: [
          defineEditorSystem(() => {
            executionOrder.push("update");
          }),
        ],
        renderSystems: [
          defineEditorSystem(() => {
            executionOrder.push("render");
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();

      editor.tick();

      expect(executionOrder).toEqual(["input", "capture", "update", "render"]);
    });
  });

  describe("defineEditorSystem", () => {
    it("should create a system function", () => {
      const execute = vi.fn();
      const system = defineEditorSystem(execute);

      // The system should be callable
      expect(typeof system).toBe("function");
    });

    it("should pass context to system", async () => {
      let capturedCtx: unknown = null;

      const plugin: EditorPlugin = {
        name: "test",
        updateSystems: [
          defineEditorSystem((ctx) => {
            capturedCtx = ctx;
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();

      editor.tick();

      expect(capturedCtx).toBeDefined();
      expect(capturedCtx).toHaveProperty("tick");
      expect(capturedCtx).toHaveProperty("entityBuffer");
    });
  });

  describe("System execution", () => {
    it("should support multiple systems per phase", async () => {
      const results: string[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        inputSystems: [
          defineEditorSystem(() => results.push("input-a")),
          defineEditorSystem(() => results.push("input-b")),
        ],
        captureSystems: [
          defineEditorSystem(() => results.push("capture-a")),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();

      editor.tick();

      expect(results).toEqual(["input-a", "input-b", "capture-a"]);
    });

    it("should execute systems from multiple plugins in order", async () => {
      const results: string[] = [];

      const pluginA: EditorPlugin = {
        name: "a",
        updateSystems: [
          defineEditorSystem(() => results.push("a-update")),
        ],
      };

      const pluginB: EditorPlugin = {
        name: "b",
        updateSystems: [
          defineEditorSystem(() => results.push("b-update")),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [pluginA, pluginB] });
      await editor.initialize();

      editor.tick();

      expect(results).toEqual(["a-update", "b-update"]);
    });
  });

  describe("Phase responsibilities (conceptual)", () => {
    it("input phase should be for converting DOM events", async () => {
      // This is a documentation/conceptual test
      const plugin: EditorPlugin = {
        name: "input-test",
        inputSystems: [
          defineEditorSystem(() => {
            // Typically: read from DOM events, write to Pointer singleton
          }),
          defineEditorSystem(() => {
            // Typically: track pressed keys, modifiers
          }),
        ],
      };

      // Plugin should compile and be usable
      editor = new Editor(mockDomElement, { plugins: [plugin] });
      expect(editor).toBeDefined();
    });

    it("capture phase should be for hit testing", async () => {
      const plugin: EditorPlugin = {
        name: "capture-test",
        captureSystems: [
          defineEditorSystem(() => {
            // Typically: find what's under pointer, set Hovered component
          }),
          defineEditorSystem(() => {
            // Typically: determine selection target
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      expect(editor).toBeDefined();
    });

    it("update phase should be for state changes", async () => {
      const plugin: EditorPlugin = {
        name: "update-test",
        updateSystems: [
          defineEditorSystem(() => {
            // Typically: update Block positions based on drag
          }),
          defineEditorSystem(() => {
            // Typically: execute queued commands
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      expect(editor).toBeDefined();
    });

    it("render phase should be for output", async () => {
      const plugin: EditorPlugin = {
        name: "render-test",
        renderSystems: [
          defineEditorSystem(() => {
            // Typically: update DOM elements to match ECS state
          }),
          defineEditorSystem(() => {
            // Typically: push changes to store adapter
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      expect(editor).toBeDefined();
    });
  });
});
