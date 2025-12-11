import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { field } from "@infinitecanvas/ecs";
import {
  Editor,
  defineBlock,
  defineMeta,
  defineSingleton,
  defineInputSystem,
  defineCaptureSystem,
  defineUpdateSystem,
  defineRenderSystem,
  type EditorPlugin,
  type StoreAdapter,
} from "../src";

describe("Editor", () => {
  let editor: Editor;

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
  });

  describe("construction", () => {
    it("should create an editor with no plugins", () => {
      editor = new Editor();
      expect(editor).toBeInstanceOf(Editor);
    });

    it("should create an editor with plugins", () => {
      const TestBlock = defineBlock({
        x: field.float32(),
      });

      const plugin: EditorPlugin = {
        name: "test",
        components: [TestBlock],
      };

      editor = new Editor({ plugins: [plugin] });
      expect(editor.hasPlugin("test")).toBe(true);
    });

    it("should create an editor with a store adapter", () => {
      const store: StoreAdapter = {
        onDocumentChange: vi.fn(),
      };

      editor = new Editor({ store });
      expect(editor.getStore()).toBe(store);
    });
  });

  describe("initialization", () => {
    it("should initialize and create context", async () => {
      editor = new Editor();
      await editor.initialize();

      const ctx = editor.getContext();
      expect(ctx).toBeDefined();
      expect(ctx.editor).toBe(editor);
    });

    it("should call plugin setup on initialize", async () => {
      const setup = vi.fn();
      const plugin: EditorPlugin = {
        name: "test",
        setup,
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      expect(setup).toHaveBeenCalledWith(editor);
    });

    it("should load from store on initialize", async () => {
      const load = vi.fn().mockResolvedValue({
        entities: new Map(),
        singletons: new Map(),
      });

      const store: StoreAdapter = { load };

      editor = new Editor({ store });
      await editor.initialize();

      expect(load).toHaveBeenCalled();
    });
  });

  describe("tick", () => {
    it("should execute systems in phase order", async () => {
      const executionOrder: string[] = [];

      const inputSystem = defineInputSystem("input", () => {
        executionOrder.push("input");
      });

      const captureSystem = defineCaptureSystem("capture", () => {
        executionOrder.push("capture");
      });

      const updateSystem = defineUpdateSystem("update", () => {
        executionOrder.push("update");
      });

      const renderSystem = defineRenderSystem("render", () => {
        executionOrder.push("render");
      });

      const plugin: EditorPlugin = {
        name: "test",
        systems: [renderSystem, updateSystem, inputSystem, captureSystem], // Out of order
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      editor.tick();

      expect(executionOrder).toEqual(["input", "capture", "update", "render"]);
    });

    it("should process nextTick callbacks before systems", async () => {
      const order: string[] = [];

      const updateSystem = defineUpdateSystem("update", () => {
        order.push("update");
      });

      const plugin: EditorPlugin = {
        name: "test",
        systems: [updateSystem],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      editor.nextTick(() => {
        order.push("nextTick");
      });

      editor.tick();

      expect(order).toEqual(["nextTick", "update"]);
    });
  });

  describe("commands", () => {
    it("should emit and execute commands", async () => {
      const execute = vi.fn();

      const plugin: EditorPlugin = {
        name: "test",
        commands: [
          {
            type: "test:action",
            execute,
          },
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      editor.emit("test:action", { value: 42 });

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({ editor }),
        { value: 42 }
      );
    });

    it("should allow subscribing to commands", async () => {
      const listener = vi.fn();

      const plugin: EditorPlugin = {
        name: "test",
        commands: [
          {
            type: "test:action",
            execute: vi.fn(),
          },
        ],
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();

      const unsubscribe = editor.getCommands().subscribe(listener);
      editor.emit("test:action", { value: 1 });

      expect(listener).toHaveBeenCalledWith("test:action", { value: 1 });

      unsubscribe();
      editor.emit("test:action", { value: 2 });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

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

      editor = new Editor({ plugins: [pluginA, pluginB] });
      await editor.initialize();

      expect(setupOrder).toEqual(["b", "a"]);
    });

    it("should throw on missing dependency", () => {
      const plugin: EditorPlugin = {
        name: "a",
        dependencies: ["missing"],
      };

      expect(() => new Editor({ plugins: [plugin] })).toThrow(
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

      expect(() => new Editor({ plugins: [pluginA, pluginB] })).toThrow(
        "Circular plugin dependency"
      );
    });

    it("should get plugin by name", async () => {
      const plugin: EditorPlugin = {
        name: "test",
      };

      editor = new Editor({ plugins: [plugin] });
      expect(editor.getPlugin("test")).toBe(plugin);
      expect(editor.getPlugin("nonexistent")).toBeUndefined();
    });
  });

  describe("dispose", () => {
    it("should call plugin teardown on dispose", async () => {
      const teardown = vi.fn();
      const plugin: EditorPlugin = {
        name: "test",
        teardown,
      };

      editor = new Editor({ plugins: [plugin] });
      await editor.initialize();
      await editor.dispose();

      expect(teardown).toHaveBeenCalledWith(editor);
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

      editor = new Editor({ plugins: [pluginA, pluginB] });
      await editor.initialize();
      await editor.dispose();

      expect(teardownOrder).toEqual(["b", "a"]);
    });
  });
});
