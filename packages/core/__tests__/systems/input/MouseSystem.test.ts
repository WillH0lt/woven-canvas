import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Editor } from "@infinitecanvas/core";
import { Mouse } from "../../../src";

describe("Mouse System", () => {
  let editor: Editor;
  let domElement: HTMLDivElement;

  beforeEach(async () => {
    domElement = document.createElement("div");
    // Set element dimensions for coordinate calculations
    Object.defineProperty(domElement, "clientWidth", { value: 800 });
    Object.defineProperty(domElement, "clientHeight", { value: 600 });
    domElement.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 50,
        width: 800,
        height: 600,
        right: 900,
        bottom: 650,
        x: 100,
        y: 50,
        toJSON: () => {},
      } as DOMRect);

    document.body.appendChild(domElement);

    editor = new Editor(domElement, {
      plugins: [],
    });
    await editor.initialize();

    // Run initial tick to set up screen dimensions
    await editor.tick();
  });

  afterEach(async () => {
    await editor.dispose();
    document.body.removeChild(domElement);
  });

  describe("position tracking", () => {
    it("should track mouse position relative to element", async () => {
      const ctx = editor._getContext()!;

      // Dispatch mousemove at client coords (150, 100)
      // Element is at (100, 50), so relative position should be (50, 50)
      window.dispatchEvent(
        new MouseEvent("mousemove", {
          clientX: 150,
          clientY: 100,
          bubbles: true,
        })
      );

      await editor.tick();

      const mouse = Mouse.read(ctx);
      expect(mouse.position[0]).toBe(50);
      expect(mouse.position[1]).toBe(50);
    });

    it("should set moveTrigger when mouse moves", async () => {
      const ctx = editor._getContext()!;

      window.dispatchEvent(
        new MouseEvent("mousemove", {
          clientX: 200,
          clientY: 150,
          bubbles: true,
        })
      );

      await editor.tick();

      const mouse = Mouse.read(ctx);
      expect(mouse.moveTrigger).toBe(true);
    });

    it("should clear moveTrigger after one frame", async () => {
      const ctx = editor._getContext()!;

      window.dispatchEvent(
        new MouseEvent("mousemove", {
          clientX: 200,
          clientY: 150,
          bubbles: true,
        })
      );

      await editor.tick();
      expect(Mouse.read(ctx).moveTrigger).toBe(true);

      await editor.tick();
      expect(Mouse.read(ctx).moveTrigger).toBe(false);
    });
  });

  describe("wheel events", () => {
    it("should track wheel delta", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new WheelEvent("wheel", {
          deltaX: 10,
          deltaY: 20,
          deltaMode: 0, // Pixel mode
          bubbles: true,
        })
      );

      await editor.tick();

      const mouse = Mouse.read(ctx);
      expect(mouse.wheelDeltaX).toBe(10);
      expect(mouse.wheelTrigger).toBe(true);
    });

    it("should set wheelTrigger when wheel scrolls", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new WheelEvent("wheel", {
          deltaX: 0,
          deltaY: 50,
          deltaMode: 0,
          bubbles: true,
        })
      );

      await editor.tick();

      expect(Mouse.read(ctx).wheelTrigger).toBe(true);
    });

    it("should clear wheel state after one frame", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new WheelEvent("wheel", {
          deltaX: 10,
          deltaY: 20,
          deltaMode: 0,
          bubbles: true,
        })
      );

      await editor.tick();
      expect(Mouse.read(ctx).wheelTrigger).toBe(true);
      expect(Mouse.read(ctx).wheelDeltaX).toBe(10);

      await editor.tick();
      expect(Mouse.read(ctx).wheelTrigger).toBe(false);
      expect(Mouse.read(ctx).wheelDeltaX).toBe(0);
      expect(Mouse.read(ctx).wheelDeltaY).toBe(0);
    });
  });

  describe("enter/leave events", () => {
    it("should set enterTrigger on mouseenter", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      await editor.tick();

      expect(Mouse.read(ctx).enterTrigger).toBe(true);
    });

    it("should set leaveTrigger on mouseleave", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      await editor.tick();

      expect(Mouse.read(ctx).leaveTrigger).toBe(true);
    });

    it("should clear enter/leave triggers after one frame", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      await editor.tick();
      expect(Mouse.read(ctx).enterTrigger).toBe(true);

      await editor.tick();
      expect(Mouse.read(ctx).enterTrigger).toBe(false);
    });
  });
});

describe("Mouse - multiple instances", () => {
  it("should isolate mouse state between editor instances", async () => {
    const domElement1 = document.createElement("div");
    const domElement2 = document.createElement("div");

    // Set up dimensions
    for (const el of [domElement1, domElement2]) {
      Object.defineProperty(el, "clientWidth", { value: 800 });
      Object.defineProperty(el, "clientHeight", { value: 600 });
      el.getBoundingClientRect = () =>
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
      document.body.appendChild(el);
    }

    const editor1 = new Editor(domElement1, {
      plugins: [],
    });
    const editor2 = new Editor(domElement2, {
      plugins: [],
    });

    await editor1.initialize();
    await editor2.initialize();

    // Initial tick for screen setup
    await editor1.tick();
    await editor2.tick();

    // Wheel event on element1 only
    domElement1.dispatchEvent(
      new WheelEvent("wheel", {
        deltaX: 10,
        deltaY: 20,
        deltaMode: 0,
        bubbles: true,
      })
    );

    await editor1.tick();
    await editor2.tick();

    const ctx1 = editor1._getContext()!;
    const ctx2 = editor2._getContext()!;

    expect(Mouse.read(ctx1).wheelTrigger).toBe(true);
    expect(Mouse.read(ctx2).wheelTrigger).toBe(false);

    await editor1.dispose();
    await editor2.dispose();
    document.body.removeChild(domElement1);
    document.body.removeChild(domElement2);
  });
});
