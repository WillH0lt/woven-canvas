import { describe, it, expect, vi, afterEach } from "vitest";
import {
  Editor,
  defineSystem,
  getResources,
  defineEditorComponent,
  field,
  createEntity,
  addComponent,
  type EditorPlugin,
  type StoreAdapter,
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

    it("should initialize store on initialize", async () => {
      const initialize = vi.fn().mockResolvedValue(undefined);

      const store: StoreAdapter = {
        onComponentAdded: vi.fn(),
        onComponentUpdated: vi.fn(),
        onComponentRemoved: vi.fn(),
        onSingletonUpdated: vi.fn(),
        commit: vi.fn(),
        initialize,
        flushChanges: vi.fn(),
      };

      editor = new Editor(mockDomElement, { store });
      await editor.initialize();

      expect(initialize).toHaveBeenCalled();
    });
  });

  describe("tick", () => {
    it("should execute systems in phase order", async () => {
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

    it("should process nextTick callbacks before systems", async () => {
      const order: string[] = [];

      const plugin: EditorPlugin = {
        name: "test",
        updateSystems: [
          defineSystem(() => {
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

  describe("entity UUID", () => {
    it("should generate a UUID when first component is added", async () => {
      const TestComponent = defineEditorComponent(
        "test",
        { value: field.float32() },
        { sync: "document" }
      );

      const store: StoreAdapter = {
        onComponentAdded: vi.fn(),
        onComponentUpdated: vi.fn(),
        onComponentRemoved: vi.fn(),
        onSingletonUpdated: vi.fn(),
        commit: vi.fn(),
        initialize: vi.fn().mockResolvedValue(undefined),
        flushChanges: vi.fn(),
      };

      const plugin: EditorPlugin = {
        name: "test",
        components: [TestComponent],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin], store });
      await editor.initialize();

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, TestComponent);
      });

      // First tick processes nextTick callback which creates entity
      await editor.tick();
      // Second tick syncs the component add event to the store
      await editor.tick();

      expect(store.onComponentAdded).toHaveBeenCalledTimes(1);
      const call = (store.onComponentAdded as ReturnType<typeof vi.fn>).mock
        .calls[0];
      const id = call[1];
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("should share the same UUID across multiple components on an entity", async () => {
      const ComponentA = defineEditorComponent(
        "compA",
        { a: field.float32() },
        { sync: "document" }
      );

      const ComponentB = defineEditorComponent(
        "compB",
        { b: field.float32() },
        { sync: "document" }
      );

      const store: StoreAdapter = {
        onComponentAdded: vi.fn(),
        onComponentUpdated: vi.fn(),
        onComponentRemoved: vi.fn(),
        onSingletonUpdated: vi.fn(),
        commit: vi.fn(),
        initialize: vi.fn().mockResolvedValue(undefined),
        flushChanges: vi.fn(),
      };

      const plugin: EditorPlugin = {
        name: "test",
        components: [ComponentA, ComponentB],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin], store });
      await editor.initialize();

      editor.nextTick((ctx) => {
        const eid = createEntity(ctx);
        addComponent(ctx, eid, ComponentA);
        addComponent(ctx, eid, ComponentB);
      });

      // First tick processes nextTick callback which creates entity
      await editor.tick();
      // Second tick syncs the component add events to the store
      await editor.tick();

      expect(store.onComponentAdded).toHaveBeenCalledTimes(2);
      const calls = (store.onComponentAdded as ReturnType<typeof vi.fn>).mock
        .calls;
      const idA = calls[0][1];
      const idB = calls[1][1];
      expect(idA).toBe(idB);
    });

    it("should use different UUIDs for different entities", async () => {
      const TestComponent = defineEditorComponent(
        "test2",
        { value: field.float32() },
        { sync: "document" }
      );

      const store: StoreAdapter = {
        onComponentAdded: vi.fn(),
        onComponentUpdated: vi.fn(),
        onComponentRemoved: vi.fn(),
        onSingletonUpdated: vi.fn(),
        commit: vi.fn(),
        initialize: vi.fn().mockResolvedValue(undefined),
        flushChanges: vi.fn(),
      };

      const plugin: EditorPlugin = {
        name: "test",
        components: [TestComponent],
      };

      editor = new Editor(mockDomElement, { plugins: [plugin], store });
      await editor.initialize();

      editor.nextTick((ctx) => {
        const eid1 = createEntity(ctx);
        addComponent(ctx, eid1, TestComponent);
        const eid2 = createEntity(ctx);
        addComponent(ctx, eid2, TestComponent);
      });

      // First tick processes nextTick callback which creates entities
      await editor.tick();
      // Second tick syncs the component add events to the store
      await editor.tick();

      expect(store.onComponentAdded).toHaveBeenCalledTimes(2);
      const calls = (store.onComponentAdded as ReturnType<typeof vi.fn>).mock
        .calls;
      const id1 = calls[0][1];
      const id2 = calls[1][1];
      expect(id1).not.toBe(id2);
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
