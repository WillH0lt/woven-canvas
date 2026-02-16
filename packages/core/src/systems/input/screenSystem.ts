import { getResources } from "@woven-ecs/core";
import { defineEditorSystem } from "../../EditorSystem";

import type { EditorResources } from "../../types";
import { Screen, Frame } from "../../singletons";

/**
 * Per-instance state for screen input
 */
interface ScreenState {
  resizePending: boolean;
  resizeObserver: ResizeObserver;
}

/**
 * Per-instance state keyed by DOM element
 */
const instanceState = new WeakMap<HTMLElement, ScreenState>();

/**
 * Attach screen resize observer.
 * Called from plugin setup.
 */
export function attachScreenObserver(domElement: HTMLElement): void {
  if (instanceState.has(domElement)) return;

  const state: ScreenState = {
    resizePending: false,
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
export function detachScreenObserver(domElement: HTMLElement): void {
  const state = instanceState.get(domElement);

  if (!state) return;

  state.resizeObserver.disconnect();
  instanceState.delete(domElement);
}

/**
 * Screen system - tracks editor element dimensions.
 *
 * Uses ResizeObserver to detect size changes and updates the Screen singleton.
 * Also handles initial sizing on the first frame.
 */
export const screenSystem = defineEditorSystem({ phase: "input" }, (ctx) => {
  const resources = getResources<EditorResources>(ctx);
  const { domElement } = resources;
  const state = instanceState.get(domElement);
  if (!state) return;

  const frame = Frame.read(ctx);

  // Handle initial sizing on first frame
  if (frame.number === 1) {
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
});
