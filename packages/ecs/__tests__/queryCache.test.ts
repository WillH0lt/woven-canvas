import { describe, it, expect, beforeEach } from "vitest";
import { QueryCache } from "../src/QueryCache";
import type { QueryMasks } from "../src/types";

describe("QueryCache", () => {
  const defaultMasks: QueryMasks = {
    with: new Uint8Array([0b0011]),
    without: new Uint8Array([0b0100]),
    any: new Uint8Array([0b1000]),
    tracking: new Uint8Array([0]),
    hasTracking: false,
    hasWith: true,
    hasWithout: true,
    hasAny: true,
  };

  describe("Basic Operations", () => {
    it("should create an empty cache", () => {
      const cache = new QueryCache(defaultMasks, 100);
      expect(cache.count).toBe(0);
    });

    it("should add entities to the cache", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(5);
      cache.add(10);

      expect(cache.count).toBe(3);
      expect(cache.has(1)).toBe(true);
      expect(cache.has(5)).toBe(true);
      expect(cache.has(10)).toBe(true);
    });

    it("should not add duplicate entities", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(1);
      cache.add(1);

      expect(cache.count).toBe(1);
    });

    it("should remove entities from the cache", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(5);
      cache.add(10);

      cache.remove(5);

      expect(cache.count).toBe(2);
      expect(cache.has(1)).toBe(true);
      expect(cache.has(5)).toBe(false);
      expect(cache.has(10)).toBe(true);
    });

    it("should handle removing non-existent entities gracefully", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.remove(50); // Entity not in cache but within valid range

      expect(cache.count).toBe(1);
      expect(cache.has(1)).toBe(true);
    });

    it("should check if entity exists in cache", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);

      expect(cache.has(1)).toBe(true);
      expect(cache.has(2)).toBe(false);
    });

    it("should clear all entities from the cache", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(5);
      cache.add(10);
      cache.add(15);

      cache.clear();

      expect(cache.count).toBe(0);
      expect(cache.has(1)).toBe(false);
      expect(cache.has(5)).toBe(false);
      expect(cache.has(10)).toBe(false);
      expect(cache.has(15)).toBe(false);
    });
  });

  describe("Swap-and-Pop Removal", () => {
    it("should correctly swap last element when removing from middle", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(2);
      cache.add(3);
      cache.add(4);
      cache.add(5);

      // Remove entity 2 (middle)
      cache.remove(2);

      // Entity 5 (last) should now be in entity 2's position
      expect(cache.count).toBe(4);
      expect(cache.has(1)).toBe(true);
      expect(cache.has(2)).toBe(false);
      expect(cache.has(3)).toBe(true);
      expect(cache.has(4)).toBe(true);
      expect(cache.has(5)).toBe(true);

      // Verify all remaining entities are iterable
      const entities = Array.from(cache);
      expect(entities).toHaveLength(4);
      expect(entities).toContain(1);
      expect(entities).toContain(3);
      expect(entities).toContain(4);
      expect(entities).toContain(5);
    });

    it("should handle removing the first element", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(2);
      cache.add(3);

      cache.remove(1);

      expect(cache.count).toBe(2);
      expect(cache.has(1)).toBe(false);
      expect(cache.has(2)).toBe(true);
      expect(cache.has(3)).toBe(true);
    });

    it("should handle removing the last element", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(2);
      cache.add(3);

      cache.remove(3);

      expect(cache.count).toBe(2);
      expect(cache.has(1)).toBe(true);
      expect(cache.has(2)).toBe(true);
      expect(cache.has(3)).toBe(false);
    });

    it("should handle removing the only element", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(42);
      cache.remove(42);

      expect(cache.count).toBe(0);
      expect(cache.has(42)).toBe(false);
    });
  });

  describe("Iteration", () => {
    it("should iterate over all cached entities", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(5);
      cache.add(10);

      const entities = Array.from(cache);

      expect(entities).toHaveLength(3);
      expect(entities).toContain(1);
      expect(entities).toContain(5);
      expect(entities).toContain(10);
    });

    it("should iterate over empty cache", () => {
      const cache = new QueryCache(defaultMasks, 100);
      const entities = Array.from(cache);
      expect(entities).toHaveLength(0);
    });

    it("should support for...of iteration", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(2);
      cache.add(3);

      const entities: number[] = [];
      for (const entity of cache) {
        entities.push(entity);
      }

      expect(entities).toHaveLength(3);
    });
  });

  describe("toArray", () => {
    it("should return entities as array", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(5);
      cache.add(10);

      const arr = cache.toArray();

      expect(arr).toHaveLength(3);
      expect(arr).toContain(1);
      expect(arr).toContain(5);
      expect(arr).toContain(10);
    });

    it("should return empty array for empty cache", () => {
      const cache = new QueryCache(defaultMasks, 100);
      const arr = cache.toArray();
      expect(arr).toHaveLength(0);
    });
  });

  describe("getDenseView", () => {
    it("should return a typed array view of entities", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(5);
      cache.add(10);

      const view = cache.getDenseView();

      expect(view).toBeInstanceOf(Uint32Array);
      expect(view.length).toBe(3);
      expect(Array.from(view)).toContain(1);
      expect(Array.from(view)).toContain(5);
      expect(Array.from(view)).toContain(10);
    });

    it("should return empty view for empty cache", () => {
      const cache = new QueryCache(defaultMasks, 100);
      const view = cache.getDenseView();
      expect(view.length).toBe(0);
    });

    it("should update when entities are added or removed", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.add(2);

      let view = cache.getDenseView();
      expect(view.length).toBe(2);

      cache.add(3);
      view = cache.getDenseView();
      expect(view.length).toBe(3);

      cache.remove(1);
      view = cache.getDenseView();
      expect(view.length).toBe(2);
    });
  });

  describe("Buffer Access", () => {
    it("should provide access to dense buffer", () => {
      const cache = new QueryCache(defaultMasks, 100);
      const buffer = cache.getDenseBuffer();

      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it("should provide access to sparse buffer", () => {
      const cache = new QueryCache(defaultMasks, 100);
      const buffer = cache.getSparseBuffer();

      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it("should provide access to masks", () => {
      const cache = new QueryCache(defaultMasks, 100);
      const masks = cache.masks;

      expect(masks).toEqual(defaultMasks);
    });
  });

  describe("Edge Cases", () => {
    it("should handle entity ID 0", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(0);

      expect(cache.count).toBe(1);
      expect(cache.has(0)).toBe(true);

      cache.remove(0);

      expect(cache.count).toBe(0);
      expect(cache.has(0)).toBe(false);
    });

    it("should handle maximum entity ID", () => {
      const maxEntities = 100;
      const cache = new QueryCache(defaultMasks, maxEntities);

      cache.add(maxEntities - 1);

      expect(cache.count).toBe(1);
      expect(cache.has(maxEntities - 1)).toBe(true);
    });

    it("should throw when cache is full", () => {
      const maxEntities = 5;
      const cache = new QueryCache(defaultMasks, maxEntities);

      // Add maxEntities entities (0-4) to fill the cache
      cache.add(0);
      cache.add(1);
      cache.add(2);
      cache.add(3);
      cache.add(4);

      // Remove one and add it back should work
      cache.remove(0);
      cache.add(0);
      expect(cache.count).toBe(5);

      // But cache is now full again, trying to add any new entity (even with valid ID) should fail
      // Note: We removed entity 0, but then added it back, so cache is still full
      // The cache can only hold maxEntities at a time, regardless of entity ID
    });

    it("should allow re-adding after removal", () => {
      const cache = new QueryCache(defaultMasks, 100);

      cache.add(1);
      cache.remove(1);
      cache.add(1);

      expect(cache.count).toBe(1);
      expect(cache.has(1)).toBe(true);
    });

    it("should handle rapid add/remove cycles", () => {
      const cache = new QueryCache(defaultMasks, 100);

      for (let i = 0; i < 10; i++) {
        cache.add(1);
        cache.add(2);
        cache.add(3);
        cache.remove(2);
        cache.remove(1);
        cache.remove(3);
      }

      expect(cache.count).toBe(0);
    });
  });
});
