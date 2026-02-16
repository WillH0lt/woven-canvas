/**
 * Shared test utilities for the editor package.
 */

import {
  type Context,
  createEntity,
  addComponent,
} from "@woven-ecs/core";
import { Block, Aabb } from "../src/components";
import { Synced } from "@woven-ecs/canvas-store";

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
 * Options for creating a test block.
 */
export interface CreateBlockOptions {
  position?: [number, number];
  size?: [number, number];
  rank?: string;
  tag?: string;
  rotateZ?: number;
  synced?: boolean;
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
  Aabb.expandByBlock(ctx, entityId, entityId);

  if (synced) {
    addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() });
  }

  return entityId;
}
