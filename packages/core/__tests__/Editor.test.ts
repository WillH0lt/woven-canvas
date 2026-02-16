import { describe, it, expect, vi, afterEach } from "vitest";
import {
  Editor,
  defineEditorSystem,
  getResources,
  type EditorPlugin,
  type EditorResources,
} from "../src";

// Mock DOM element for tests
const mockDomElement = document.createElement("div");

describe("Editor", () => {
  let editor: Editor;

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
  });

  describe("initialization", () => {
    it("should initialize and create context", async () => {
      editor = new Editor(mockDomElement);
      await editor.initialize();

      const ctx = editor._getContext();
      expect(ctx).toBeDefined();
      const resources = getResources<EditorResources>(ctx);
      expect(resources.editor).toBe(editor);
    });

    it("should call plugin setup on initialize", async () => {
      const setup = vi.fn();
      const plugin: EditorPlugin = {
        name: "test",
        setup,
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();

      expect(setup).toHaveBeenCalledWith(editor._getContext());
    });

  });

  describe("tick", () => {
    it("should execute systems in phase order", async () => {
      const executionOrder: string[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineEditorSystem({ phase: "input" }, () => {
            executionOrder.push("input");
          }),
          defineEditorSystem({ phase: "capture" }, () => {
            executionOrder.push("capture");
          }),
          defineEditorSystem({ phase: "update" }, () => {
            executionOrder.push("update");
          }),
          defineEditorSystem({ phase: "render" }, () => {
            executionOrder.push("render");
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();

      await editor.tick();

      expect(executionOrder).toEqual(["input", "capture", "update", "render"]);
    });

    it("should process nextTick callbacks before systems", async () => {
      const order: string[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        systems: [
          defineEditorSystem({ phase: "update" }, () => {
            order.push("update");
          }),
        ],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();

      editor.nextTick(() => {
        order.push("nextTick");
      });

      await editor.tick();

      expect(order).toEqual(["nextTick", "update"]);
    });
  });

  // Note: Command tests are in command.test.ts
  // The new command system uses defineCommand() + editor.command() instead of emit()

  describe("plugins", () => {
    it("should resolve plugin dependencies", async () => {
      const setupOrder: string[] = [];

      const pluginA: EditorPlugin = {
        name: "a",
        dependencies: ["b"],
        setup: () => {
          setupOrder.push("a");
        },
      };

      const pluginB: EditorPlugin = {
        name: "b",
        setup: () => {
          setupOrder.push("b");
        },
      };

      editor = new Editor(mockDomElement, { plugins: [pluginA, pluginB] });
      await editor.initialize();

      expect(setupOrder).toEqual(["b", "a"]);
    });

    it("should throw on missing dependency", () => {
      const plugin: EditorPlugin = {
        name: "a",
        dependencies: ["missing"],
      };

      expect(() => new Editor(mockDomElement, { plugins: [plugin] })).toThrow(
        'Plugin "a" depends on "missing" which is not registered'
      );
    });

    it("should throw on circular dependency", () => {
      const pluginA: EditorPlugin = {
        name: "a",
        dependencies: ["b"],
      };

      const pluginB: EditorPlugin = {
        name: "b",
        dependencies: ["a"],
      };

      expect(
        () => new Editor(mockDomElement, { plugins: [pluginA, pluginB] })
      ).toThrow("Circular plugin dependency");
    });
  });

  describe("dispose", () => {
    it("should call plugin teardown on dispose", async () => {
      const teardown = vi.fn();
      const plugin: EditorPlugin = {
        name: "test",
        teardown,
      };

      editor = new Editor(mockDomElement, { plugins: [plugin] });
      await editor.initialize();
      await editor.dispose();

      expect(teardown).toHaveBeenCalledWith(editor._getContext());
    });

    it("should call teardown in reverse order", async () => {
      const teardownOrder: string[] = [];

      const pluginA: EditorPlugin = {
        name: "a",
        teardown: () => {
          teardownOrder.push("a");
        },
      };

      const pluginB: EditorPlugin = {
        name: "b",
        teardown: () => {
          teardownOrder.push("b");
        },
      };

      editor = new Editor(mockDomElement, { plugins: [pluginA, pluginB] });
      await editor.initialize();
      await editor.dispose();

      expect(teardownOrder).toEqual(["b", "a"]);
    });
  });
});
