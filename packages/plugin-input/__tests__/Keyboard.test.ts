import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Editor } from "@infinitecanvas/editor";
import { InputPlugin, Keyboard, KeyCode } from "../src";

describe("Keyboard", () => {
  let editor: Editor;
  let domElement: HTMLDivElement;

  beforeEach(async () => {
    // Create a DOM element for testing
    domElement = document.createElement("div");
    document.body.appendChild(domElement);

    editor = new Editor(domElement, {
      plugins: [InputPlugin],
    });
    await editor.initialize();
  });

  afterEach(async () => {
    await editor.dispose();
    document.body.removeChild(domElement);
  });

  describe("key state tracking", () => {
    it("should track key down state", () => {
      const ctx = editor._getContext()!;

      // Simulate keydown
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { keyCode: KeyCode.A, bubbles: true })
      );

      editor.tick();

      expect(Keyboard.isKeyDown(ctx, KeyCode.A)).toBe(true);
      expect(Keyboard.isKeyDownTrigger(ctx, KeyCode.A)).toBe(true);
    });

    it("should clear trigger after one frame", () => {
      const ctx = editor._getContext()!;

      // Simulate keydown
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { keyCode: KeyCode.A, bubbles: true })
      );

      editor.tick();
      expect(Keyboard.isKeyDownTrigger(ctx, KeyCode.A)).toBe(true);

      // Second tick - trigger should be cleared
      editor.tick();
      expect(Keyboard.isKeyDown(ctx, KeyCode.A)).toBe(true); // Still down
      expect(Keyboard.isKeyDownTrigger(ctx, KeyCode.A)).toBe(false); // Trigger cleared
    });

    it("should track key up state", () => {
      const ctx = editor._getContext()!;

      // Simulate keydown then keyup
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { keyCode: KeyCode.A, bubbles: true })
      );
      editor.tick();

      domElement.dispatchEvent(
        new KeyboardEvent("keyup", { keyCode: KeyCode.A, bubbles: true })
      );
      editor.tick();

      expect(Keyboard.isKeyDown(ctx, KeyCode.A)).toBe(false);
      expect(Keyboard.isKeyUpTrigger(ctx, KeyCode.A)).toBe(true);
    });

    it("should track multiple keys simultaneously", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { keyCode: KeyCode.A, bubbles: true })
      );
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { keyCode: KeyCode.B, bubbles: true })
      );
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { keyCode: KeyCode.C, bubbles: true })
      );

      editor.tick();

      expect(Keyboard.isKeyDown(ctx, KeyCode.A)).toBe(true);
      expect(Keyboard.isKeyDown(ctx, KeyCode.B)).toBe(true);
      expect(Keyboard.isKeyDown(ctx, KeyCode.C)).toBe(true);
      expect(Keyboard.isKeyDown(ctx, KeyCode.D)).toBe(false);
    });
  });

  describe("modifier tracking", () => {
    it("should track shift modifier", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          keyCode: KeyCode.A,
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
          keyCode: KeyCode.A,
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
          keyCode: KeyCode.A,
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
          keyCode: KeyCode.A,
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
        new KeyboardEvent("keydown", { keyCode: KeyCode.A, bubbles: true })
      );
      domElement.dispatchEvent(
        new KeyboardEvent("keydown", { keyCode: KeyCode.B, bubbles: true })
      );
      editor.tick();

      expect(Keyboard.isKeyDown(ctx, KeyCode.A)).toBe(true);
      expect(Keyboard.isKeyDown(ctx, KeyCode.B)).toBe(true);

      // Blur
      domElement.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      editor.tick();

      expect(Keyboard.isKeyDown(ctx, KeyCode.A)).toBe(false);
      expect(Keyboard.isKeyDown(ctx, KeyCode.B)).toBe(false);
    });

    it("should reset modifiers on blur", () => {
      const ctx = editor._getContext()!;

      domElement.dispatchEvent(
        new KeyboardEvent("keydown", {
          keyCode: KeyCode.A,
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

  describe("KeyCode constants", () => {
    it("should have correct letter key codes", () => {
      expect(KeyCode.A).toBe(65);
      expect(KeyCode.Z).toBe(90);
    });

    it("should have correct digit key codes", () => {
      expect(KeyCode.Digit0).toBe(48);
      expect(KeyCode.Digit9).toBe(57);
    });

    it("should have correct navigation key codes", () => {
      expect(KeyCode.ArrowLeft).toBe(37);
      expect(KeyCode.ArrowUp).toBe(38);
      expect(KeyCode.ArrowRight).toBe(39);
      expect(KeyCode.ArrowDown).toBe(40);
      expect(KeyCode.Escape).toBe(27);
      expect(KeyCode.Enter).toBe(13);
      expect(KeyCode.Space).toBe(32);
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
      plugins: [InputPlugin],
    });
    const editor2 = new Editor(domElement2, {
      plugins: [InputPlugin],
    });

    await editor1.initialize();
    await editor2.initialize();

    // Press key on editor1 only
    domElement1.dispatchEvent(
      new KeyboardEvent("keydown", { keyCode: KeyCode.A, bubbles: true })
    );

    editor1.tick();
    editor2.tick();

    const ctx1 = editor1._getContext()!;
    const ctx2 = editor2._getContext()!;

    expect(Keyboard.isKeyDown(ctx1, KeyCode.A)).toBe(true);
    expect(Keyboard.isKeyDown(ctx2, KeyCode.A)).toBe(false);

    await editor1.dispose();
    await editor2.dispose();
    document.body.removeChild(domElement1);
    document.body.removeChild(domElement2);
  });
});
