import {
  defineInputSystem,
  type EditorContext,
  createEntity,
  removeEntity,
  addComponent,
} from "@infinitecanvas/editor";
import { getResources } from "@infinitecanvas/ecs";
import {
  Pointer,
  getPointerButton,
  getPointerType,
  addPointerSample,
} from "../components/Pointer";
import { Screen } from "../components/Screen";
import type { InputResources } from "../types";

/**
 * Buffered pointer event
 */
interface BufferedPointerEvent {
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
  pointerId: number;
  clientX: number;
  clientY: number;
  button: number;
  pointerType: string;
  pressure: number;
  target: EventTarget | null;
}

/**
 * Per-instance state for pointer input
 */
interface PointerState {
  eventsBuffer: BufferedPointerEvent[];
  frameCount: number;
  /** Maps pointerId -> entityId for this instance */
  pointerEntityMap: Map<number, number>;
  onPointerDown: (e: PointerEvent) => void;
  onContextMenu: (e: MouseEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
}

/**
 * Per-instance state keyed by DOM element
 */
const instanceState = new WeakMap<HTMLElement, PointerState>();

/**
 * Attach pointer event listeners.
 * Called from plugin setup.
 */
export function attachPointerListeners(resources: InputResources): void {
  const { domElement } = resources;

  if (instanceState.has(domElement)) return;

  const state: PointerState = {
    eventsBuffer: [],
    frameCount: 0,
    pointerEntityMap: new Map(),
    onPointerDown: (e: PointerEvent) => {
      state.eventsBuffer.push({
        type: "pointerdown",
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        pointerType: e.pointerType,
        pressure: e.pressure,
        target: e.target,
      });
    },
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();

      // Check if there's already a pointerdown in the buffer for this frame
      const hasPointerDown = state.eventsBuffer.some(
        (evt) => evt.type === "pointerdown"
      );
      if (hasPointerDown) return;

      // Create a synthetic pointer event for right-click
      state.eventsBuffer.push({
        type: "pointerdown",
        pointerId: 0,
        clientX: e.clientX,
        clientY: e.clientY,
        button: 2, // Right button
        pointerType: "mouse",
        pressure: 0.5,
        target: e.target,
      });
    },
    onPointerMove: (e: PointerEvent) => {
      state.eventsBuffer.push({
        type: "pointermove",
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        pointerType: e.pointerType,
        pressure: e.pressure,
        target: e.target,
      });
    },
    onPointerUp: (e: PointerEvent) => {
      state.eventsBuffer.push({
        type: "pointerup",
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        pointerType: e.pointerType,
        pressure: e.pressure,
        target: e.target,
      });
    },
    onPointerCancel: (e: PointerEvent) => {
      state.eventsBuffer.push({
        type: "pointercancel",
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        pointerType: e.pointerType,
        pressure: e.pressure,
        target: e.target,
      });
    },
  };

  instanceState.set(domElement, state);

  // Pointer down and context menu on element only
  domElement.addEventListener("pointerdown", state.onPointerDown);
  domElement.addEventListener("contextmenu", state.onContextMenu);

  // Move, up, cancel on window to capture outside movement
  window.addEventListener("pointermove", state.onPointerMove);
  window.addEventListener("pointerup", state.onPointerUp);
  window.addEventListener("pointercancel", state.onPointerCancel);
}

/**
 * Detach pointer event listeners.
 * Called from plugin teardown.
 */
export function detachPointerListeners(resources: InputResources): void {
  const { domElement } = resources;
  const state = instanceState.get(domElement);

  if (!state) return;

  domElement.removeEventListener("pointerdown", state.onPointerDown);
  domElement.removeEventListener("contextmenu", state.onContextMenu);
  window.removeEventListener("pointermove", state.onPointerMove);
  window.removeEventListener("pointerup", state.onPointerUp);
  window.removeEventListener("pointercancel", state.onPointerCancel);

  instanceState.delete(domElement);
}

/**
 * Pointer input system - manages pointer entities for touch/pen/mouse.
 *
 * Creates a Pointer entity on pointerdown and deletes it on pointerup.
 * This allows multiple simultaneous pointers (for touch).
 */
export const pointerInputSystem = defineInputSystem(
  "pointer-input",
  (ctx: EditorContext) => {
    const resources = getResources<InputResources>(ctx);
    const { domElement } = resources;
    const state = instanceState.get(domElement);
    if (!state) return;

    state.frameCount++;
    const screen = Screen.read(ctx);
    const time = state.frameCount / 60; // Approximate time in seconds

    // Process buffered events
    for (const event of state.eventsBuffer) {
      switch (event.type) {
        case "pointerdown": {
          const position: [number, number] = [
            event.clientX - screen.left,
            event.clientY - screen.top,
          ];

          // Create pointer entity
          const entityId = createEntity(ctx);
          addComponent(ctx, entityId, Pointer, {
            id: event.pointerId,
            position: position,
            downPosition: position,
            downFrame: state.frameCount,
            button: getPointerButton(event.button),
            pointerType: getPointerType(event.pointerType),
            pressure: event.pressure,
            obscured: event.target !== domElement,
          });

          // Add initial position sample
          const pointer = Pointer.write(ctx, entityId);
          addPointerSample(pointer, position, time);

          // Track in map
          state.pointerEntityMap.set(event.pointerId, entityId);
          break;
        }

        case "pointermove": {
          const entityId = state.pointerEntityMap.get(event.pointerId);
          if (entityId === undefined) break;

          const position: [number, number] = [
            event.clientX - screen.left,
            event.clientY - screen.top,
          ];

          const pointer = Pointer.write(ctx, entityId);
          addPointerSample(pointer, position, time);
          pointer.pressure = event.pressure;
          pointer.obscured = event.target !== domElement;
          break;
        }

        case "pointerup":
        case "pointercancel": {
          const entityId = state.pointerEntityMap.get(event.pointerId);
          if (entityId === undefined) break;

          // Update final position before removal
          const position: [number, number] = [
            event.clientX - screen.left,
            event.clientY - screen.top,
          ];

          const pointer = Pointer.write(ctx, entityId);
          addPointerSample(pointer, position, time);

          // Remove entity
          removeEntity(ctx, entityId);
          state.pointerEntityMap.delete(event.pointerId);
          break;
        }
      }
    }

    // Clear buffer
    state.eventsBuffer.length = 0;
  }
);
