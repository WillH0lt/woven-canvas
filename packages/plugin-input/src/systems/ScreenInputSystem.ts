import { defineInputSystem, type EditorContext } from "@infinitecanvas/editor";
import { getResources } from "@infinitecanvas/ecs";
import { Screen } from "../components/Screen";
import type { InputResources } from "../types";

/**
 * Per-instance state for screen input
 */
interface ScreenState {
  resizePending: boolean;
  resizeObserver: ResizeObserver;
  frameCount: number;
}

/**
 * Per-instance state keyed by DOM element
 */
const instanceState = new WeakMap<HTMLElement, ScreenState>();

/**
 * Attach screen resize observer.
 * Called from plugin setup.
 */
export function attachScreenObserver(resources: InputResources): void {
  const { domElement } = resources;

  if (instanceState.has(domElement)) return;

  const state: ScreenState = {
    resizePending: false,
    frameCount: 0,
    resizeObserver: new ResizeObserver(() => {
      state.resizePending = true;
    }),
  };

  instanceState.set(domElement, state);
  state.resizeObserver.observe(domElement);
}

/**
 * Detach screen resize observer.
 * Called from plugin teardown.
 */
export function detachScreenObserver(resources: InputResources): void {
  const { domElement } = resources;
  const state = instanceState.get(domElement);

  if (!state) return;

  state.resizeObserver.disconnect();
  instanceState.delete(domElement);
}

/**
 * Screen input system - tracks editor element dimensions.
 *
 * Uses ResizeObserver to detect size changes and updates the Screen singleton.
 * Also handles initial sizing on the first frame.
 */
export const screenInputSystem = defineInputSystem(
  "screen-input",
  (ctx: EditorContext) => {
    const resources = getResources<InputResources>(ctx);
    const { domElement } = resources;
    const state = instanceState.get(domElement);
    if (!state) return;

    state.frameCount++;

    // Handle initial sizing on first frame
    if (state.frameCount === 1) {
      state.resizePending = true;
    }

    // Update screen dimensions if resize pending
    if (state.resizePending) {
      const screen = Screen.write(ctx);

      screen.width = domElement.clientWidth;
      screen.height = domElement.clientHeight;

      const rect = domElement.getBoundingClientRect();
      screen.left = rect.left;
      screen.top = rect.top;

      state.resizePending = false;
    }
  }
);
