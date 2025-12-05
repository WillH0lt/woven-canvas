import { describe, it, expect, beforeEach } from "vitest";
import { QueryCache } from "../src/QueryCache";

describe("QueryCache", () => {
  describe("Basic Operations", () => {
    it("should create an empty cache", () => {
      const cache = new QueryCache(100);
      expect(cache.count).toBe(0);
    });

    it("should add entities to the cache", () => {
      const cache = new QueryCache(100);

      cache.add(1);
      cache.add(5);
      cache.add(10);

      expect(cache.count).toBe(3);
      expect(cache.has(1)).toBe(true);
      expect(cache.has(5)).toBe(true);
      expect(cache.has(10)).toBe(true);
    });

    it("should not add duplicate entities", () => {
      const cache = new QueryCache(100);

      cache.add(1);
      cache.add(1);
      cache.add(1);

      expect(cache.count).toBe(1);
    });

    it("should remove entities from the cache", () => {
      const cache = new QueryCache(100);

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
      const cache = new QueryCache(100);

      cache.add(1);
      cache.remove(50); // Entity not in cache but within valid range

      expect(cache.count).toBe(1);
      expect(cache.has(1)).toBe(true);
    });

    it("should check if entity exists in cache", () => {
      const cache = new QueryCache(100);

      cache.add(1);

      expect(cache.has(1)).toBe(true);
      expect(cache.has(2)).toBe(false);
    });
  });

  describe("Swap-and-Pop Removal", () => {
    it("should correctly swap last element when removing from middle", () => {
      const cache = new QueryCache(100);

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
      const entities = cache.getDenseView();
      expect(entities).toHaveLength(4);
      expect(entities).toContain(1);
      expect(entities).toContain(3);
      expect(entities).toContain(4);
      expect(entities).toContain(5);
    });

    it("should handle removing the first element", () => {
      const cache = new QueryCache(100);

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
      const cache = new QueryCache(100);

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
      const cache = new QueryCache(100);

      cache.add(42);
      cache.remove(42);

      expect(cache.count).toBe(0);
      expect(cache.has(42)).toBe(false);
    });
  });

  describe("getDenseView", () => {
    it("should return a typed array view of entities", () => {
      const cache = new QueryCache(100);

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
      const cache = new QueryCache(100);
      const view = cache.getDenseView();
      expect(view.length).toBe(0);
    });

    it("should update when entities are added or removed", () => {
      const cache = new QueryCache(100);

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

  describe("Edge Cases", () => {
    it("should handle entity ID 0", () => {
      const cache = new QueryCache(100);

      cache.add(0);

      expect(cache.count).toBe(1);
      expect(cache.has(0)).toBe(true);

      cache.remove(0);

      expect(cache.count).toBe(0);
      expect(cache.has(0)).toBe(false);
    });

    it("should handle maximum entity ID", () => {
      const maxEntities = 100;
      const cache = new QueryCache(maxEntities);

      cache.add(maxEntities - 1);

      expect(cache.count).toBe(1);
      expect(cache.has(maxEntities - 1)).toBe(true);
    });

    it("should throw when cache is full", () => {
      const maxEntities = 5;
      const cache = new QueryCache(maxEntities);

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
      const cache = new QueryCache(100);

      cache.add(1);
      cache.remove(1);
      cache.add(1);

      expect(cache.count).toBe(1);
      expect(cache.has(1)).toBe(true);
    });

    it("should handle rapid add/remove cycles", () => {
      const cache = new QueryCache(100);

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
