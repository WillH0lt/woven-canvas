/**
 * Shared test utilities for simulating pointer and mouse events.
 */

import {
  type Context,
  createEntity,
  addComponent,
  Synced,
} from "@infinitecanvas/editor";
import { Block, Aabb, Selected } from "../src/components";

/**
 * Options for creating a test block.
 */
export interface CreateBlockOptions {
  position?: [number, number];
  size?: [number, number];
  rank?: string;
  tag?: string;
  rotateZ?: number;
  synced?: boolean;
  selected?: boolean;
}

/**
 * Create a block entity for testing.
 * Returns the entity ID.
 */
export function createBlock(
  ctx: Context,
  options: CreateBlockOptions = {}
): number {
  const {
    position = [100, 100],
    size = [100, 100],
    rank = "a",
    tag = "text",
    rotateZ = 0,
    synced = true,
    selected = false,
  } = options;

  const entityId = createEntity(ctx);
  addComponent(ctx, entityId, Block, {
    position,
    size,
    rank,
    tag,
    rotateZ,
  });
  addComponent(ctx, entityId, Aabb, {});
  // Compute actual AABB from block corners
  Aabb.computeFromBlock(ctx, entityId);

  if (synced) {
    addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() });
  }

  if (selected) {
    addComponent(ctx, entityId, Selected, { selectedBy: "" });
  }

  return entityId;
}

export interface PointerEventOptions {
  shiftKey?: boolean;
  altKey?: boolean;
  button?: number;
}

/**
 * Creates a pointer event simulator with tracked pointer IDs.
 * Each instance maintains its own pointer ID counter for consistent
 * pointer events across a test.
 */
export function createPointerSimulator() {
  let currentPointerId = 1;

  return {
    /**
     * Reset the pointer ID counter (call in beforeEach).
     */
    reset() {
      currentPointerId = 1;
    },

    /**
     * Get the current pointer ID.
     */
    get pointerId() {
      return currentPointerId;
    },

    /**
     * Simulate a pointer down event on an element.
     */
    pointerDown(
      element: HTMLElement,
      x: number,
      y: number,
      options: PointerEventOptions = {}
    ): void {
      element.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: x,
          clientY: y,
          button: options.button ?? 0,
          pointerId: currentPointerId,
          pointerType: "mouse",
          pressure: 0.5,
          shiftKey: options.shiftKey ?? false,
          altKey: options.altKey ?? false,
          bubbles: true,
        })
      );
    },

    /**
     * Simulate a pointer up event.
     * Dispatches on window since PointerInputSystem listens there.
     * Increments the pointer ID after the event.
     */
    pointerUp(x: number, y: number, options: PointerEventOptions = {}): void {
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          clientX: x,
          clientY: y,
          button: options.button ?? 0,
          pointerId: currentPointerId,
          pointerType: "mouse",
          pressure: 0,
          shiftKey: options.shiftKey ?? false,
          altKey: options.altKey ?? false,
          bubbles: true,
        })
      );
      currentPointerId++;
    },

    /**
     * Simulate a pointer move event.
     * Dispatches on window since PointerInputSystem listens there.
     * Also dispatches a mouse move for intersection detection.
     */
    pointerMove(x: number, y: number, options: PointerEventOptions = {}): void {
      // Also dispatch mouse move for intersection detection
      simulateMouseMove(x, y);
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: x,
          clientY: y,
          button: options.button ?? 0,
          pointerId: currentPointerId,
          pointerType: "mouse",
          pressure: 0.5,
          shiftKey: options.shiftKey ?? false,
          altKey: options.altKey ?? false,
          bubbles: true,
        })
      );
    },

    /**
     * Simulate a complete click (pointer down + up) at a position.
     */
    click(
      element: HTMLElement,
      x: number,
      y: number,
      options: PointerEventOptions = {}
    ): void {
      this.pointerDown(element, x, y, options);
      this.pointerUp(x, y, options);
    },
  };
}

/**
 * Simulate a mouse move event.
 * Dispatches on window since mouseInputSystem listens there.
 */
export function simulateMouseMove(x: number, y: number): void {
  window.dispatchEvent(
    new MouseEvent("mousemove", {
      clientX: x,
      clientY: y,
      bubbles: true,
    })
  );
}

/**
 * Simulate mouse leaving a DOM element.
 */
export function simulateMouseLeave(element: HTMLElement): void {
  element.dispatchEvent(
    new MouseEvent("mouseleave", {
      bubbles: true,
    })
  );
}

/**
 * Create a mock DOM element for tests.
 * Appends to document body to ensure events work correctly.
 */
export function createMockElement(): HTMLElement {
  const element = document.createElement("div");
  document.body.appendChild(element);
  return element;
}

/**
 * Simulate a key down event.
 * Dispatches on the element since KeyboardInputSystem listens there.
 * @param element - The DOM element to dispatch the event on
 * @param code - The keyboard code (e.g., "KeyA", "ShiftLeft", "Space")
 * @param options - Modifier key options
 */
export function simulateKeyDown(
  element: HTMLElement,
  code: string,
  options: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean } = {}
): void {
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      code,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      bubbles: true,
    })
  );
}

/**
 * Simulate a key up event.
 * Dispatches on the element since KeyboardInputSystem listens there.
 * @param element - The DOM element to dispatch the event on
 * @param code - The keyboard code (e.g., "KeyA", "ShiftLeft", "Space")
 * @param options - Modifier key options
 */
export function simulateKeyUp(
  element: HTMLElement,
  code: string,
  options: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean } = {}
): void {
  element.dispatchEvent(
    new KeyboardEvent("keyup", {
      code,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      bubbles: true,
    })
  );
}
