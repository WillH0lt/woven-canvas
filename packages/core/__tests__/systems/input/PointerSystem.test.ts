import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Editor, defineQuery } from "@infinitecanvas/core";
import { Pointer, PointerButton, PointerType } from "../../../src";

// Query for pointer entities
const pointerQuery = defineQuery((q) => q.with(Pointer));

describe("Pointer System", () => {
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

    // Initial tick to set up screen
    await editor.tick();
  });

  afterEach(async () => {
    await editor.dispose();
    document.body.removeChild(domElement);
  });

  describe("pointer entity lifecycle", () => {
    it("should create pointer entity on pointerdown", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          pointerType: "mouse",
          pressure: 0.5,
          bubbles: true,
        })
      );

      await editor.tick();

      const pointers = pointerQuery.current(ctx);
      expect(pointers.length).toBe(1);
    });

    it("should remove pointer entity on pointerup", async () => {
      const ctx = editor._getContext()!;

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

      expect(pointerQuery.current(ctx).length).toBe(1);

      window.dispatchEvent(
        new PointerEvent("pointerup", {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          pointerType: "mouse",
          bubbles: true,
        })
      );
      await editor.tick();

      expect(pointerQuery.current(ctx).length).toBe(0);
    });

    it("should remove pointer entity on pointercancel", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          pointerType: "touch",
          bubbles: true,
        })
      );
      await editor.tick();

      expect(pointerQuery.current(ctx).length).toBe(1);

      window.dispatchEvent(
        new PointerEvent("pointercancel", {
          pointerId: 1,
          bubbles: true,
        })
      );
      await editor.tick();

      expect(pointerQuery.current(ctx).length).toBe(0);
    });
  });

  describe("pointer data", () => {
    it("should store pointer position relative to element", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 150,
          clientY: 200,
          button: 0,
          pointerType: "mouse",
          bubbles: true,
        })
      );
      await editor.tick();

      const pointers = pointerQuery.current(ctx);
      const pointer = Pointer.read(ctx, pointers[0]);

      expect(pointer.position[0]).toBe(150);
      expect(pointer.position[1]).toBe(200);
      expect(pointer.downPosition[0]).toBe(150);
      expect(pointer.downPosition[1]).toBe(200);
    });

    it("should update position on pointermove", async () => {
      const ctx = editor._getContext()!;

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

      window.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerId: 1,
          clientX: 200,
          clientY: 250,
          pointerType: "mouse",
          bubbles: true,
        })
      );
      await editor.tick();

      const pointers = pointerQuery.current(ctx);
      const pointer = Pointer.read(ctx, pointers[0]);

      expect(pointer.position[0]).toBe(200);
      expect(pointer.position[1]).toBe(250);
      // downPosition should remain unchanged
      expect(pointer.downPosition[0]).toBe(100);
      expect(pointer.downPosition[1]).toBe(100);
    });

    it("should store pointer button", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 2, // Right button
          pointerType: "mouse",
          bubbles: true,
        })
      );
      await editor.tick();

      const pointers = pointerQuery.current(ctx);
      const pointer = Pointer.read(ctx, pointers[0]);

      expect(pointer.button).toBe(PointerButton.Right);
    });

    it("should store pointer type", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          pointerType: "pen",
          bubbles: true,
        })
      );
      await editor.tick();

      const pointers = pointerQuery.current(ctx);
      const pointer = Pointer.read(ctx, pointers[0]);

      expect(pointer.pointerType).toBe(PointerType.Pen);
    });

    it("should store pressure", async () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          pointerType: "pen",
          pressure: 0.75,
          bubbles: true,
        })
      );
      await editor.tick();

      const pointers = pointerQuery.current(ctx);
      const pointer = Pointer.read(ctx, pointers[0]);

      expect(pointer.pressure).toBe(0.75);
    });
  });

  describe("multiple pointers (touch)", () => {
    it("should support multiple simultaneous pointers", async () => {
      const ctx = editor._getContext()!;

      // First touch
      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          pointerType: "touch",
          bubbles: true,
        })
      );

      // Second touch
      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 2,
          clientX: 200,
          clientY: 200,
          button: 0,
          pointerType: "touch",
          bubbles: true,
        })
      );

      await editor.tick();

      const pointers = pointerQuery.current(ctx);
      expect(pointers.length).toBe(2);

      // Verify they have different pointer IDs
      // Note: ECS read() returns a view object that gets updated on each call,
      // so we must extract the pointerId immediately before calling read() again
      const id1 = Pointer.read(ctx, pointers[0]).pointerId;
      const id2 = Pointer.read(ctx, pointers[1]).pointerId;
      expect(id1).not.toBe(id2);
    });

    it("should remove correct pointer on individual release", async () => {
      const ctx = editor._getContext()!;

      // Two touches down
      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          pointerType: "touch",
          bubbles: true,
        })
      );
      domElement.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 2,
          clientX: 200,
          clientY: 200,
          pointerType: "touch",
          bubbles: true,
        })
      );
      await editor.tick();

      expect(pointerQuery.current(ctx).length).toBe(2);

      // Release first touch
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          pointerId: 1,
          bubbles: true,
        })
      );
      await editor.tick();

      const pointers = pointerQuery.current(ctx);
      expect(pointers.length).toBe(1);

      // Remaining pointer should be pointer 2
      const remaining = Pointer.read(ctx, pointers[0]);
      expect(remaining.pointerId).toBe(2);
    });
  });

  describe("class methods", () => {
    it("getButton should map button numbers correctly", () => {
      expect(Pointer.getButton(0)).toBe(PointerButton.Left);
      expect(Pointer.getButton(1)).toBe(PointerButton.Middle);
      expect(Pointer.getButton(2)).toBe(PointerButton.Right);
      expect(Pointer.getButton(3)).toBe(PointerButton.Back);
      expect(Pointer.getButton(4)).toBe(PointerButton.Forward);
      expect(Pointer.getButton(99)).toBe(PointerButton.None);
    });

    it("getType should map pointer types correctly", () => {
      expect(Pointer.getType("mouse")).toBe(PointerType.Mouse);
      expect(Pointer.getType("pen")).toBe(PointerType.Pen);
      expect(Pointer.getType("touch")).toBe(PointerType.Touch);
      expect(Pointer.getType("unknown")).toBe(PointerType.Mouse); // Default
    });
  });
});

describe("Pointer - multiple instances", () => {
  it("should isolate pointer entities between editor instances", async () => {
    const domElement1 = document.createElement("div");
    const domElement2 = document.createElement("div");

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

    await editor1.tick();
    await editor2.tick();

    // Pointer down on element1 only
    domElement1.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        button: 0,
        pointerType: "mouse",
        bubbles: true,
      })
    );

    await editor1.tick();
    await editor2.tick();

    const ctx1 = editor1._getContext()!;
    const ctx2 = editor2._getContext()!;

    expect(pointerQuery.current(ctx1).length).toBe(1);
    expect(pointerQuery.current(ctx2).length).toBe(0);

    await editor1.dispose();
    await editor2.dispose();
    document.body.removeChild(domElement1);
    document.body.removeChild(domElement2);
  });
});
