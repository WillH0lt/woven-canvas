import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Editor, defineQuery, Keyboard, Mouse, Screen, Pointer } from "../src";

// Query for pointer entities
const pointerQuery = defineQuery((q) => q.with(Pointer));

describe("CorePlugin", () => {
  describe("plugin registration", () => {
    it("should register as 'input' plugin", async () => {
      const domElement = document.createElement("div");
      document.body.appendChild(domElement);

      const editor = new Editor(domElement, {
        plugins: [],
      });
      await editor.initialize();

      // Verify plugin is registered by checking its components work
      const ctx = editor._getContext()!;
      expect(() => Keyboard.read(ctx)).not.toThrow();
      expect(() => Mouse.read(ctx)).not.toThrow();
      expect(() => Screen.read(ctx)).not.toThrow();

      await editor.dispose();
      document.body.removeChild(domElement);
    });
  });

  describe("component registration", () => {
    it("should register all singletons", async () => {
      const domElement = document.createElement("div");
      document.body.appendChild(domElement);

      const editor = new Editor(domElement, {
        plugins: [],
      });
      await editor.initialize();

      const ctx = editor._getContext()!;

      // Verify singletons are accessible
      expect(() => Keyboard.read(ctx)).not.toThrow();
      expect(() => Mouse.read(ctx)).not.toThrow();
      expect(() => Screen.read(ctx)).not.toThrow();

      await editor.dispose();
      document.body.removeChild(domElement);
    });
  });

  describe("system execution", () => {
    it("should execute all input systems on tick", async () => {
      const domElement = document.createElement("div");
      Object.defineProperty(domElement, "clientWidth", { value: 800 });
      Object.defineProperty(domElement, "clientHeight", { value: 600 });
      domElement.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect);
      document.body.appendChild(domElement);

      const editor = new Editor(domElement, {
        plugins: [],
      });
      await editor.initialize();

      // First tick should initialize screen dimensions
      await editor.tick();

      const ctx = editor._getContext()!;
      const screen = Screen.read(ctx);

      expect(screen.width).toBe(800);
      expect(screen.height).toBe(600);

      await editor.dispose();
      document.body.removeChild(domElement);
    });
  });

  describe("cleanup", () => {
    it("should cleanup event listeners on dispose", async () => {
      const domElement = document.createElement("div");
      const addEventListenerSpy = vi.spyOn(domElement, "addEventListener");
      const removeEventListenerSpy = vi.spyOn(
        domElement,
        "removeEventListener"
      );
      document.body.appendChild(domElement);

      const editor = new Editor(domElement, {
        plugins: [],
      });
      await editor.initialize();

      // Verify listeners were added
      expect(addEventListenerSpy).toHaveBeenCalled();

      await editor.dispose();

      // Verify listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalled();

      document.body.removeChild(domElement);
    });
  });
});

describe("CorePlugin - integration", () => {
  let editor: Editor;
  let domElement: HTMLDivElement;

  beforeEach(async () => {
    domElement = document.createElement("div");
    Object.defineProperty(domElement, "clientWidth", { value: 800 });
    Object.defineProperty(domElement, "clientHeight", { value: 600 });
    domElement.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);
    document.body.appendChild(domElement);

    editor = new Editor(domElement, {
      plugins: [],
    });
    await editor.initialize();
    await editor.tick();
  });

  afterEach(async () => {
    await editor.dispose();
    document.body.removeChild(domElement);
  });

  it("should handle combined keyboard and pointer input", async () => {
    const ctx = editor._getContext()!;

    // Hold shift while clicking
    domElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "ShiftLeft",
        shiftKey: true,
        bubbles: true,
      })
    );

    domElement.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        button: 0,
        pointerType: "mouse",
        bubbles: true,
      })
    );

    await editor.tick();

    const keyboard = Keyboard.read(ctx);
    expect(keyboard.shiftDown).toBe(true);

    // Pointer should also exist
    expect(pointerQuery.current(ctx).length).toBe(1);
  });

  it("should handle rapid input sequences", async () => {
    const ctx = editor._getContext()!;

    // Multiple events in one frame
    for (let i = 0; i < 10; i++) {
      window.dispatchEvent(
        new MouseEvent("mousemove", {
          clientX: i * 10,
          clientY: i * 5,
          bubbles: true,
        })
      );
    }

    await editor.tick();

    // Should have processed all events, final position should be last event
    const mouse = Mouse.read(ctx);
    expect(mouse.position[0]).toBe(90);
    expect(mouse.position[1]).toBe(45);
  });
});
