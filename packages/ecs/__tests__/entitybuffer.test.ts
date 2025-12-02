import { describe, it, expect, beforeEach } from "vitest";

import { EntityBufferView } from "../src/EntityBuffer";
import type { QueryMasks } from "../src/types";

// Helper to create a mock QueryMasks for testing
function masks(
  withMask: number,
  withoutMask: number,
  anyMask: number
): QueryMasks {
  return {
    with: withMask,
    without: withoutMask,
    any: anyMask,
    tracking: 0,
  };
}

describe("EntityBufferView", () => {
  let buffer: EntityBufferView;

  beforeEach(() => {
    buffer = new EntityBufferView();
  });

  describe("constructor", () => {
    it("should create a buffer with default capacity", () => {
      expect(buffer).toBeInstanceOf(EntityBufferView);
      expect(buffer.getBuffer()).toBeDefined();
    });

    it("should use SharedArrayBuffer by default if available", () => {
      if (typeof SharedArrayBuffer !== "undefined") {
        expect(buffer.getBuffer()).toBeInstanceOf(SharedArrayBuffer);
      } else {
        expect(buffer.getBuffer()).toBeInstanceOf(ArrayBuffer);
      }
    });
  });

  describe("fromTransfer", () => {
    it("should create a buffer from an existing ArrayBuffer", () => {
      const originalBuffer = buffer.getBuffer();
      const transferredBuffer = EntityBufferView.fromTransfer(originalBuffer);

      expect(transferredBuffer).toBeInstanceOf(EntityBufferView);
      expect(transferredBuffer.getBuffer()).toBe(originalBuffer);
    });

    it("should share state with original buffer", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);

      const transferredBuffer = EntityBufferView.fromTransfer(
        buffer.getBuffer()
      );
      expect(transferredBuffer.has(0)).toBe(true);
      expect(transferredBuffer.hasComponent(0, 0b001)).toBe(true);
    });
  });

  describe("create", () => {
    it("should create an entity (mark as alive)", () => {
      buffer.create(0);
      expect(buffer.has(0)).toBe(true);
    });

    it("should create entity with no components", () => {
      buffer.create(0);
      expect(buffer.hasComponent(0, 0b111111111)).toBe(false);
    });

    it("should handle multiple entities independently", () => {
      buffer.create(0);
      buffer.create(1);
      buffer.create(2);

      expect(buffer.has(0)).toBe(true);
      expect(buffer.has(1)).toBe(true);
      expect(buffer.has(2)).toBe(true);
    });
  });

  describe("addComponentToEntity", () => {
    it("should add a component to an entity", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);

      expect(buffer.hasComponent(0, 0b001)).toBe(true);
    });

    it("should add multiple components", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);
      buffer.addComponentToEntity(0, 0b010);
      buffer.addComponentToEntity(0, 0b100);

      expect(buffer.hasComponent(0, 0b001)).toBe(true);
      expect(buffer.hasComponent(0, 0b010)).toBe(true);
      expect(buffer.hasComponent(0, 0b100)).toBe(true);
    });

    it("should handle large component masks", () => {
      buffer.create(0);
      const largeMask = 0x7fffffff; // All bits except the alive bit
      buffer.addComponentToEntity(0, largeMask);

      expect(buffer.hasComponent(0, largeMask)).toBe(true);
    });
  });

  describe("removeComponentFromEntity", () => {
    it("should remove a component from an entity", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);
      expect(buffer.hasComponent(0, 0b001)).toBe(true);

      buffer.removeComponentFromEntity(0, 0b001);
      expect(buffer.hasComponent(0, 0b001)).toBe(false);
    });

    it("should remove specific component without affecting others", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);
      buffer.addComponentToEntity(0, 0b010);
      buffer.addComponentToEntity(0, 0b100);

      buffer.removeComponentFromEntity(0, 0b010);

      expect(buffer.hasComponent(0, 0b001)).toBe(true);
      expect(buffer.hasComponent(0, 0b010)).toBe(false);
      expect(buffer.hasComponent(0, 0b100)).toBe(true);
    });

    it("should preserve alive flag when removing components", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b111);
      buffer.removeComponentFromEntity(0, 0b111);

      expect(buffer.has(0)).toBe(true);
      expect(buffer.hasComponent(0, 0b111)).toBe(false);
    });
  });

  describe("hasComponent", () => {
    it("should return true for components that entity has", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b101);

      expect(buffer.hasComponent(0, 0b101)).toBe(true);
    });

    it("should return false for components entity doesn't have", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);

      expect(buffer.hasComponent(0, 0b010)).toBe(false);
    });

    it("should work with multiple component bits", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);
      buffer.addComponentToEntity(0, 0b010);

      expect(buffer.hasComponent(0, 0b001)).toBe(true);
      expect(buffer.hasComponent(0, 0b010)).toBe(true);
      expect(buffer.hasComponent(0, 0b011)).toBe(true);
    });
  });

  describe("matches", () => {
    it("should match entities with required components (with)", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);
      buffer.addComponentToEntity(0, 0b010);

      expect(buffer.matches(0, masks(0b001, 0, 0))).toBe(true);
      expect(buffer.matches(0, masks(0b011, 0, 0))).toBe(true);
      expect(buffer.matches(0, masks(0b100, 0, 0))).toBe(false);
    });

    it("should exclude entities with forbidden components (without)", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);
      buffer.addComponentToEntity(0, 0b010);

      expect(buffer.matches(0, masks(0, 0b100, 0))).toBe(true);
      expect(buffer.matches(0, masks(0, 0b001, 0))).toBe(false);
    });

    it("should match entities with any of specified components (any)", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);

      expect(buffer.matches(0, masks(0, 0, 0b001))).toBe(true);
      expect(buffer.matches(0, masks(0, 0, 0b011))).toBe(true);
      expect(buffer.matches(0, masks(0, 0, 0b100))).toBe(false);
    });

    it("should return false for dead entities", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);
      buffer.delete(0);

      expect(buffer.matches(0, masks(0b001, 0, 0))).toBe(false);
    });

    it("should combine all criteria correctly", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b1111);

      // Has 0b11, doesn't have 0b10000, has any of 0b1000
      expect(buffer.matches(0, masks(0b11, 0b10000, 0b1000))).toBe(true);

      // Fails 'with' check
      expect(buffer.matches(0, masks(0b100000, 0, 0))).toBe(false);

      // Fails 'without' check
      expect(buffer.matches(0, masks(0, 0b0010, 0))).toBe(false);

      // Fails 'any' check
      expect(buffer.matches(0, masks(0, 0, 0b100000))).toBe(false);
    });
  });

  describe("delete", () => {
    it("should mark entity as dead", () => {
      buffer.create(0);
      expect(buffer.has(0)).toBe(true);

      buffer.delete(0);
      expect(buffer.has(0)).toBe(false);
    });

    it("should clear all component data", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b111);
      expect(buffer.hasComponent(0, 0b111)).toBe(true);

      buffer.delete(0);
      expect(buffer.has(0)).toBe(false);
      expect(buffer.hasComponent(0, 0b111)).toBe(false);
    });

    it("should allow re-creating deleted entities", () => {
      buffer.create(0);
      buffer.addComponentToEntity(0, 0b001);
      buffer.delete(0);
      expect(buffer.has(0)).toBe(false);

      buffer.create(0);
      expect(buffer.has(0)).toBe(true);
      expect(buffer.hasComponent(0, 0b001)).toBe(false); // New entity has no components
    });
  });

  describe("has", () => {
    it("should return true for alive entities", () => {
      buffer.create(0);
      expect(buffer.has(0)).toBe(true);
    });

    it("should return false for dead entities", () => {
      expect(buffer.has(0)).toBe(false);

      buffer.create(0);
      expect(buffer.has(0)).toBe(true);

      buffer.delete(0);
      expect(buffer.has(0)).toBe(false);
    });
  });

  describe("getBuffer", () => {
    it("should return the underlying ArrayBuffer", () => {
      const underlyingBuffer = buffer.getBuffer();
      expect(underlyingBuffer).toBeInstanceOf(
        typeof SharedArrayBuffer !== "undefined"
          ? SharedArrayBuffer
          : ArrayBuffer
      );
    });

    it("should allow sharing buffer state across instances", () => {
      buffer.create(5);
      buffer.addComponentToEntity(5, 0b101);

      const sharedBuffer = buffer.getBuffer();
      const newBuffer = EntityBufferView.fromTransfer(sharedBuffer);

      expect(newBuffer.has(5)).toBe(true);
      expect(newBuffer.hasComponent(5, 0b101)).toBe(true);
    });
  });
});
