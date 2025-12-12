import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Editor, defineQuery } from "@infinitecanvas/editor";
import { InputPlugin, Keyboard, Mouse, Screen, Pointer } from "../src";
import type { InputResources } from "../src";

// Query for pointer entities
const pointerQuery = defineQuery((q) => q.with(Pointer));

describe("InputPlugin", () => {
  describe("plugin registration", () => {
    it("should register as 'input' plugin", async () => {
      const domElement = document.createElement("div");
      document.body.appendChild(domElement);

      const editor = new Editor({
        plugins: [InputPlugin],
        resources: { domElement } satisfies InputResources,
      });

      expect(editor.hasPlugin("input")).toBe(true);
      expect(editor.getPlugin("input")).toBe(InputPlugin);

      await editor.dispose();
      document.body.removeChild(domElement);
    });

    it("should throw if domElement is not provided", async () => {
      const editor = new Editor({
        plugins: [InputPlugin],
        resources: {}, // Missing domElement
      });

      await expect(editor.initialize()).rejects.toThrow(
        "domElement is required"
      );

      await editor.dispose();
    });
  });

  describe("component registration", () => {
    it("should register all singletons", async () => {
      const domElement = document.createElement("div");
      document.body.appendChild(domElement);

      const editor = new Editor({
        plugins: [InputPlugin],
        resources: { domElement } satisfies InputResources,
      });
      await editor.initialize();

      const ctx = editor.getContext()!;

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
        }) as DOMRect;
      document.body.appendChild(domElement);

      const editor = new Editor({
        plugins: [InputPlugin],
        resources: { domElement } satisfies InputResources,
      });
      await editor.initialize();

      // First tick should initialize screen dimensions
      editor.tick();

      const ctx = editor.getContext()!;
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

      const editor = new Editor({
        plugins: [InputPlugin],
        resources: { domElement } satisfies InputResources,
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

describe("InputPlugin - integration", () => {
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
      }) as DOMRect;
    document.body.appendChild(domElement);

    editor = new Editor({
      plugins: [InputPlugin],
      resources: { domElement } satisfies InputResources,
    });
    await editor.initialize();
    editor.tick();
  });

  afterEach(async () => {
    await editor.dispose();
    document.body.removeChild(domElement);
  });

  it("should handle combined keyboard and pointer input", () => {
    const ctx = editor.getContext()!;

    // Hold shift while clicking
    domElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        keyCode: 16, // Shift
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

    editor.tick();

    const keyboard = Keyboard.read(ctx);
    expect(keyboard.shiftDown).toBe(true);

    // Pointer should also exist
    expect(pointerQuery.current(ctx).length).toBe(1);
  });

  it("should handle rapid input sequences", () => {
    const ctx = editor.getContext()!;

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

    editor.tick();

    // Should have processed all events, final position should be last event
    const mouse = Mouse.read(ctx);
    expect(mouse.position[0]).toBe(90);
    expect(mouse.position[1]).toBe(45);
  });
});
