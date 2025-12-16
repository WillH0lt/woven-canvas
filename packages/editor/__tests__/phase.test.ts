import { describe, it, expect, vi, afterEach } from "vitest";
import { Editor, defineSystem, type EditorPlugin } from "../src";

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
          defineSystem(() => {
            executionOrder.push("input");
          }),
        ],
        captureSystems: [
          defineSystem(() => {
            executionOrder.push("capture");
          }),
        ],
        updateSystems: [
          defineSystem(() => {
            executionOrder.push("update");
          }),
        ],
        renderSystems: [
          defineSystem(() => {
            executionOrder.push("render");
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();

      await editor.tick();

      expect(executionOrder).toEqual(["input", "capture", "update", "render"]);
    });
  });

  describe("System execution", () => {
    it("should support multiple systems per phase", async () => {
      const results: string[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        inputSystems: [
          defineSystem(() => results.push("input-a")),
          defineSystem(() => results.push("input-b")),
        ],
        captureSystems: [defineSystem(() => results.push("capture-a"))],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();

      await editor.tick();

      expect(results).toEqual(["input-a", "input-b", "capture-a"]);
    });

    it("should execute systems from multiple plugins in order", async () => {
      const results: string[] = [];

      const pluginA: EditorPlugin = {
        name: "a",
        updateSystems: [defineSystem(() => results.push("a-update"))],
      };

      const pluginB: EditorPlugin = {
        name: "b",
        updateSystems: [defineSystem(() => results.push("b-update"))],
      };

      editor = new Editor(mockDomElement, { plugins: [pluginA, pluginB] });
      await editor.initialize();

      await editor.tick();

      expect(results).toEqual(["a-update", "b-update"]);
    });
  });

  describe("Phase responsibilities (conceptual)", () => {
    it("input phase should be for converting DOM events", async () => {
      // This is a documentation/conceptual test
      const plugin: EditorPlugin = {
        name: "input-test",
        inputSystems: [
          defineSystem(() => {
            // Typically: read from DOM events, write to Pointer singleton
          }),
          defineSystem(() => {
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
          defineSystem(() => {
            // Typically: find what's under pointer, set Hovered component
          }),
          defineSystem(() => {
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
          defineSystem(() => {
            // Typically: update Block positions based on drag
          }),
          defineSystem(() => {
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
          defineSystem(() => {
            // Typically: update DOM elements to match ECS state
          }),
          defineSystem(() => {
            // Typically: push changes to store adapter
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      expect(editor).toBeDefined();
    });
  });
});
