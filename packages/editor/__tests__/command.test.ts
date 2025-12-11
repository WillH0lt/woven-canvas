import { describe, it, expect, vi } from "vitest";
import { createCommandRegistry, type CommandHandler } from "../src/command";
import type { EditorContext } from "../src/types";

describe("CommandRegistry", () => {
  const mockContext = {
    editor: { emit: vi.fn() },
    entityBuffer: {},
    tick: 1,
  } as unknown as EditorContext;

  describe("register", () => {
    it("should register a command handler", () => {
      const registry = createCommandRegistry(() => mockContext);
      const handler: CommandHandler<{ value: number }> = {
        type: "test:action",
        execute: vi.fn(),
      };

      registry.register(handler);

      // Verify by emitting
      registry.emit("test:action", { value: 42 });
      expect(handler.execute).toHaveBeenCalledWith(mockContext, { value: 42 });
    });

    it("should allow multiple handlers for different types", () => {
      const registry = createCommandRegistry(() => mockContext);

      const handler1: CommandHandler = {
        type: "action:one",
        execute: vi.fn(),
      };

      const handler2: CommandHandler = {
        type: "action:two",
        execute: vi.fn(),
      };

      registry.register(handler1);
      registry.register(handler2);

      registry.emit("action:one", {});
      registry.emit("action:two", {});

      expect(handler1.execute).toHaveBeenCalledTimes(1);
      expect(handler2.execute).toHaveBeenCalledTimes(1);
    });

    it("should override handler when registering same type twice", () => {
      const registry = createCommandRegistry(() => mockContext);

      const firstHandler: CommandHandler = {
        type: "test:action",
        execute: vi.fn(),
      };

      const secondHandler: CommandHandler = {
        type: "test:action",
        execute: vi.fn(),
      };

      registry.register(firstHandler);
      registry.register(secondHandler);

      registry.emit("test:action", {});

      expect(firstHandler.execute).not.toHaveBeenCalled();
      expect(secondHandler.execute).toHaveBeenCalled();
    });
  });

  describe("emit", () => {
    it("should execute handler with correct context and payload", () => {
      const registry = createCommandRegistry(() => mockContext);
      const execute = vi.fn();

      registry.register({
        type: "test:action",
        execute,
      });

      const payload = { x: 10, y: 20, name: "test" };
      registry.emit("test:action", payload);

      expect(execute).toHaveBeenCalledWith(mockContext, payload);
    });

    it("should do nothing when emitting unregistered command", () => {
      const registry = createCommandRegistry(() => mockContext);

      // Should not throw
      expect(() => {
        registry.emit("nonexistent:action", {});
      }).not.toThrow();
    });

    it("should handle multiple emissions", () => {
      const registry = createCommandRegistry(() => mockContext);
      const execute = vi.fn();

      registry.register({
        type: "counter:increment",
        execute,
      });

      registry.emit("counter:increment", { amount: 1 });
      registry.emit("counter:increment", { amount: 5 });
      registry.emit("counter:increment", { amount: 10 });

      expect(execute).toHaveBeenCalledTimes(3);
      expect(execute).toHaveBeenNthCalledWith(1, mockContext, { amount: 1 });
      expect(execute).toHaveBeenNthCalledWith(2, mockContext, { amount: 5 });
      expect(execute).toHaveBeenNthCalledWith(3, mockContext, { amount: 10 });
    });
  });

  describe("subscribe", () => {
    it("should notify subscribers when commands are emitted", () => {
      const registry = createCommandRegistry(() => mockContext);
      const listener = vi.fn();

      registry.register({
        type: "test:action",
        execute: vi.fn(),
      });

      registry.subscribe(listener);
      registry.emit("test:action", { value: 42 });

      expect(listener).toHaveBeenCalledWith("test:action", { value: 42 });
    });

    it("should support multiple subscribers", () => {
      const registry = createCommandRegistry(() => mockContext);
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      registry.register({
        type: "test:action",
        execute: vi.fn(),
      });

      registry.subscribe(listener1);
      registry.subscribe(listener2);
      registry.subscribe(listener3);

      registry.emit("test:action", { data: "hello" });

      expect(listener1).toHaveBeenCalledWith("test:action", { data: "hello" });
      expect(listener2).toHaveBeenCalledWith("test:action", { data: "hello" });
      expect(listener3).toHaveBeenCalledWith("test:action", { data: "hello" });
    });

    it("should return unsubscribe function", () => {
      const registry = createCommandRegistry(() => mockContext);
      const listener = vi.fn();

      registry.register({
        type: "test:action",
        execute: vi.fn(),
      });

      const unsubscribe = registry.subscribe(listener);

      registry.emit("test:action", { first: true });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      registry.emit("test:action", { second: true });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should notify subscribers even for unregistered commands", () => {
      const registry = createCommandRegistry(() => mockContext);
      const listener = vi.fn();

      registry.subscribe(listener);
      registry.emit("unregistered:action", { data: "test" });

      expect(listener).toHaveBeenCalledWith("unregistered:action", {
        data: "test",
      });
    });
  });

  describe("real-world scenarios", () => {
    it("should handle block creation command", () => {
      const registry = createCommandRegistry(() => mockContext);
      const createdBlocks: any[] = [];

      registry.register({
        type: "block:create",
        execute: (ctx, payload: { x: number; y: number; type: string }) => {
          createdBlocks.push({
            id: `block-${createdBlocks.length}`,
            ...payload,
          });
        },
      });

      registry.emit("block:create", { x: 100, y: 200, type: "sticky-note" });
      registry.emit("block:create", { x: 300, y: 400, type: "shape" });

      expect(createdBlocks).toEqual([
        { id: "block-0", x: 100, y: 200, type: "sticky-note" },
        { id: "block-1", x: 300, y: 400, type: "shape" },
      ]);
    });

    it("should handle selection commands", () => {
      const registry = createCommandRegistry(() => mockContext);
      let selection: string[] = [];

      registry.register({
        type: "selection:set",
        execute: (ctx, payload: { ids: string[] }) => {
          selection = payload.ids;
        },
      });

      registry.register({
        type: "selection:add",
        execute: (ctx, payload: { id: string }) => {
          if (!selection.includes(payload.id)) {
            selection = [...selection, payload.id];
          }
        },
      });

      registry.register({
        type: "selection:clear",
        execute: () => {
          selection = [];
        },
      });

      registry.emit("selection:set", { ids: ["block-1", "block-2"] });
      expect(selection).toEqual(["block-1", "block-2"]);

      registry.emit("selection:add", { id: "block-3" });
      expect(selection).toEqual(["block-1", "block-2", "block-3"]);

      registry.emit("selection:clear", {});
      expect(selection).toEqual([]);
    });

    it("should support undo/redo command pattern", () => {
      const registry = createCommandRegistry(() => mockContext);
      const history: string[] = [];
      const undoStack: string[] = [];
      const redoStack: string[] = [];

      registry.register({
        type: "history:push",
        execute: (ctx, payload: { action: string }) => {
          history.push(payload.action);
          undoStack.push(payload.action);
          redoStack.length = 0; // Clear redo stack
        },
      });

      registry.register({
        type: "history:undo",
        execute: () => {
          const action = undoStack.pop();
          if (action) {
            redoStack.push(action);
          }
        },
      });

      registry.register({
        type: "history:redo",
        execute: () => {
          const action = redoStack.pop();
          if (action) {
            undoStack.push(action);
          }
        },
      });

      registry.emit("history:push", { action: "create-block" });
      registry.emit("history:push", { action: "move-block" });
      expect(undoStack).toEqual(["create-block", "move-block"]);

      registry.emit("history:undo", {});
      expect(undoStack).toEqual(["create-block"]);
      expect(redoStack).toEqual(["move-block"]);

      registry.emit("history:redo", {});
      expect(undoStack).toEqual(["create-block", "move-block"]);
      expect(redoStack).toEqual([]);
    });
  });
});
