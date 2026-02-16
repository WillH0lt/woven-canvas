import ResizeObserver from "resize-observer-polyfill";

globalThis.ResizeObserver = ResizeObserver;

// Mock getSelection for jsdom (used by @floating-ui/vue and other libraries)
if (typeof globalThis.getSelection === "undefined") {
  (globalThis as any).getSelection = () => ({
    rangeCount: 0,
    getRangeAt: () => null,
    removeAllRanges: () => {},
    addRange: () => {},
    toString: () => "",
  });
}
