import { describe, it, expect, vi } from "vitest";
import {
  defineInputSystem,
  defineCaptureSystem,
  defineUpdateSystem,
  defineRenderSystem,
  PHASE_ORDER,
  type PhaseSystem,
} from "../src";

describe("System Phases", () => {
  describe("PHASE_ORDER", () => {
    it("should have correct phase order", () => {
      expect(PHASE_ORDER).toEqual(["input", "capture", "update", "render"]);
    });

    it("should be readonly", () => {
      expect(Object.isFrozen(PHASE_ORDER)).toBe(true);
    });
  });

  describe("defineInputSystem", () => {
    it("should create an input phase system", () => {
      const execute = vi.fn();
      const system = defineInputSystem("test-input", execute);

      expect(system.phase).toBe("input");
      expect(system.name).toBe("test-input");
      expect(system.execute).toBe(execute);
    });
  });

  describe("defineCaptureSystem", () => {
    it("should create a capture phase system", () => {
      const execute = vi.fn();
      const system = defineCaptureSystem("test-capture", execute);

      expect(system.phase).toBe("capture");
      expect(system.name).toBe("test-capture");
      expect(system.execute).toBe(execute);
    });
  });

  describe("defineUpdateSystem", () => {
    it("should create an update phase system", () => {
      const execute = vi.fn();
      const system = defineUpdateSystem("test-update", execute);

      expect(system.phase).toBe("update");
      expect(system.name).toBe("test-update");
      expect(system.execute).toBe(execute);
    });
  });

  describe("defineRenderSystem", () => {
    it("should create a render phase system", () => {
      const execute = vi.fn();
      const system = defineRenderSystem("test-render", execute);

      expect(system.phase).toBe("render");
      expect(system.name).toBe("test-render");
      expect(system.execute).toBe(execute);
    });
  });

  describe("System execution", () => {
    it("should allow systems to access editor context", () => {
      let capturedCtx: any = null;

      const system = defineUpdateSystem("test", (ctx) => {
        capturedCtx = ctx;
      });

      // Simulate what Editor does
      const mockCtx = {
        editor: { emit: vi.fn() },
        entityBuffer: {},
        tick: 1,
      };

      system.execute(mockCtx as any);

      expect(capturedCtx).toBe(mockCtx);
      expect(capturedCtx.editor).toBeDefined();
    });

    it("should support multiple systems per phase", () => {
      const results: string[] = [];

      const systems: PhaseSystem[] = [
        defineInputSystem("input-a", () => results.push("input-a")),
        defineInputSystem("input-b", () => results.push("input-b")),
        defineCaptureSystem("capture-a", () => results.push("capture-a")),
      ];

      // Execute all systems
      for (const system of systems) {
        system.execute({} as any);
      }

      expect(results).toEqual(["input-a", "input-b", "capture-a"]);
    });
  });

  describe("Phase responsibilities", () => {
    it("input phase should be for converting DOM events", () => {
      // This is a documentation/conceptual test
      const pointerInput = defineInputSystem("pointer", (ctx) => {
        // Typically: read from DOM events, write to Pointer singleton
      });

      const keyboardInput = defineInputSystem("keyboard", (ctx) => {
        // Typically: track pressed keys, modifiers
      });

      expect(pointerInput.phase).toBe("input");
      expect(keyboardInput.phase).toBe("input");
    });

    it("capture phase should be for hit testing", () => {
      const hoverDetection = defineCaptureSystem("hover", (ctx) => {
        // Typically: find what's under pointer, set Hovered component
      });

      const selectionCapture = defineCaptureSystem("selection", (ctx) => {
        // Typically: determine selection target
      });

      expect(hoverDetection.phase).toBe("capture");
      expect(selectionCapture.phase).toBe("capture");
    });

    it("update phase should be for state changes", () => {
      const moveBlocks = defineUpdateSystem("move", (ctx) => {
        // Typically: update Block positions based on drag
      });

      const processCommands = defineUpdateSystem("commands", (ctx) => {
        // Typically: execute queued commands
      });

      expect(moveBlocks.phase).toBe("update");
      expect(processCommands.phase).toBe("update");
    });

    it("render phase should be for output", () => {
      const domSync = defineRenderSystem("dom", (ctx) => {
        // Typically: update DOM elements to match ECS state
      });

      const storeSync = defineRenderSystem("store", (ctx) => {
        // Typically: push changes to store adapter
      });

      expect(domSync.phase).toBe("render");
      expect(storeSync.phase).toBe("render");
    });
  });
});
