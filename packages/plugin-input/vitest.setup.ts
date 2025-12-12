import { vi } from "vitest";

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    // Immediately trigger with empty entries (simulating initial observation)
  }

  unobserve() {}

  disconnect() {}
};

// Polyfill PointerEvent for jsdom (which only has MouseEvent)
class MockPointerEvent extends MouseEvent {
  public readonly pointerId: number;
  public readonly pressure: number;
  public readonly pointerType: string;

  constructor(type: string, init?: PointerEventInit) {
    super(type, init);
    this.pointerId = init?.pointerId ?? 0;
    this.pressure = init?.pressure ?? 0;
    this.pointerType = init?.pointerType ?? "mouse";
  }
}

// @ts-ignore
global.PointerEvent = MockPointerEvent;
