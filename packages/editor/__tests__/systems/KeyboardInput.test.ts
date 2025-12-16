import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Editor } from "@infinitecanvas/editor";
import { Keyboard, Key } from "../../src";

describe("Keyboard", () => {
  let editor: Editor;
  let domElement: HTMLDivElement;

  beforeEach(async () => {
    // Create a DOM element for testing
    domElement = document.createElement("div");
    document.body.appendChild(domElement);

    editor = new Editor(domElement, {
      plugins: [],
    });
    await editor.initialize();
  });

  afterEach(async () => {
    await editor.dispose();
    document.body.removeChild(domElement);
  });

  describe("key state tracking", () => {
    it("should track key down state", async () => {
      const ctx = editor._getContext()!;

      // Simulate keydown using event.code (layout-independent)
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyA", bubbles: true })
      );

      editor.tick();

      expect(Keyboard.isKeyDown(ctx, Key.A)).toBe(true);
      expect(Keyboard.isKeyDownTrigger(ctx, Key.A)).toBe(true);
    });

    it("should clear trigger after one frame", async () => {
      const ctx = editor._getContext()!;

      // Simulate keydown
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyA", bubbles: true })
      );

      editor.tick();
      expect(Keyboard.isKeyDownTrigger(ctx, Key.A)).toBe(true);

      // Second tick - trigger should be cleared
      editor.tick();
      expect(Keyboard.isKeyDown(ctx, Key.A)).toBe(true); // Still down
      expect(Keyboard.isKeyDownTrigger(ctx, Key.A)).toBe(false); // Trigger cleared
    });

    it("should track key up state", () => {
      const ctx = editor._getContext()!;

      // Simulate keydown then keyup
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyA", bubbles: true })
      );
      editor.tick();

      domElement.dispatchEvent(
        new KeyboardEvent("keyup", { code: "KeyA", bubbles: true })
      );
      editor.tick();

      expect(Keyboard.isKeyDown(ctx, Key.A)).toBe(false);
      expect(Keyboard.isKeyUpTrigger(ctx, Key.A)).toBe(true);
    });

    it("should track multiple keys simultaneously", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyA", bubbles: true })
      );
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyB", bubbles: true })
      );
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyC", bubbles: true })
      );

      editor.tick();

      expect(Keyboard.isKeyDown(ctx, Key.A)).toBe(true);
      expect(Keyboard.isKeyDown(ctx, Key.B)).toBe(true);
      expect(Keyboard.isKeyDown(ctx, Key.C)).toBe(true);
      expect(Keyboard.isKeyDown(ctx, Key.D)).toBe(false);
    });
  });

  describe("modifier tracking", () => {
    it("should track shift modifier", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyA",
          shiftKey: true,
          bubbles: true,
        })
      );

      editor.tick();

      const keyboard = Keyboard.read(ctx);
      expect(keyboard.shiftDown).toBe(true);
    });

    it("should track alt modifier", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyA",
          altKey: true,
          bubbles: true,
        })
      );

      editor.tick();

      const keyboard = Keyboard.read(ctx);
      expect(keyboard.altDown).toBe(true);
    });

    it("should track ctrl/meta modifier as modDown", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyA",
          ctrlKey: true,
          bubbles: true,
        })
      );

      editor.tick();

      const keyboard = Keyboard.read(ctx);
      expect(keyboard.modDown).toBe(true);
    });

    it("should track meta key as modDown", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyA",
          metaKey: true,
          bubbles: true,
        })
      );

      editor.tick();

      const keyboard = Keyboard.read(ctx);
      expect(keyboard.modDown).toBe(true);
    });
  });

  describe("blur handling", () => {
    it("should reset all keys on blur", () => {
      const ctx = editor._getContext()!;

      // Press some keys
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyA", bubbles: true })
      );
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyB", bubbles: true })
      );
      editor.tick();

      expect(Keyboard.isKeyDown(ctx, Key.A)).toBe(true);
      expect(Keyboard.isKeyDown(ctx, Key.B)).toBe(true);

      // Blur
      domElement.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      editor.tick();

      expect(Keyboard.isKeyDown(ctx, Key.A)).toBe(false);
      expect(Keyboard.isKeyDown(ctx, Key.B)).toBe(false);
    });

    it("should reset modifiers on blur", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyA",
          shiftKey: true,
          altKey: true,
          ctrlKey: true,
          bubbles: true,
        })
      );
      editor.tick();

      const keyboardBefore = Keyboard.read(ctx);
      expect(keyboardBefore.shiftDown).toBe(true);
      expect(keyboardBefore.altDown).toBe(true);
      expect(keyboardBefore.modDown).toBe(true);

      // Blur
      domElement.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      editor.tick();

      const keyboardAfter = Keyboard.read(ctx);
      expect(keyboardAfter.shiftDown).toBe(false);
      expect(keyboardAfter.altDown).toBe(false);
      expect(keyboardAfter.modDown).toBe(false);
    });
  });
});

describe("Keyboard - multiple instances", () => {
  it("should isolate keyboard state between editor instances", async () => {
    const domElement1 = document.createElement("div");
    const domElement2 = document.createElement("div");
    document.body.appendChild(domElement1);
    document.body.appendChild(domElement2);

    const editor1 = new Editor(domElement1, {
      plugins: [],
    });
    const editor2 = new Editor(domElement2, {
      plugins: [],
    });

    await editor1.initialize();
    await editor2.initialize();

    // Press key on editor1 only
    domElement1.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyA", bubbles: true })
    );

    editor1.tick();
    editor2.tick();

    const ctx1 = editor1._getContext()!;
    const ctx2 = editor2._getContext()!;

    expect(Keyboard.isKeyDown(ctx1, Key.A)).toBe(true);
    expect(Keyboard.isKeyDown(ctx2, Key.A)).toBe(false);

    await editor1.dispose();
    await editor2.dispose();
    document.body.removeChild(domElement1);
    document.body.removeChild(domElement2);
  });
});
