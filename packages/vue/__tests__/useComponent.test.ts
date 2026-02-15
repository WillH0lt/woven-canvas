import { describe, it, expect, beforeEach } from "vitest";
import { provide, createApp, h, defineComponent } from "vue";
import { useComponent } from "../src/composables/useComponent";
import { INFINITE_CANVAS_KEY, type InfiniteCanvasContext } from "../src/injection";
import { defineCanvasComponent, field } from "@infinitecanvas/editor";

describe("useComponent", () => {
  // Create properly typed component definitions
  const TestComponent = defineCanvasComponent({ name: "TestComponent" }, {
    value: field.int32(),
  });

  let mockCanvasContext: InfiniteCanvasContext;
  let mockSubscriptions: Map<number, Map<string, Set<(value: unknown) => void>>>;
  let mockEntities: Set<number>;

  beforeEach(() => {
    mockSubscriptions = new Map();
    mockEntities = new Set();

    // Mock editor returns null so we skip the eager hasComponent check
    // The initial value comes from subscriptions in our tests
    mockCanvasContext = {
      hasEntity: (entityId) => mockEntities.has(entityId),
      getEditor: () => null, // No editor = skip eager read
      getSessionId: () => null,
      getUserBySessionId: () => null,
      subscribeComponent: (entityId, componentName, callback) => {
        let entitySubs = mockSubscriptions.get(entityId);
        if (!entitySubs) {
          entitySubs = new Map();
          mockSubscriptions.set(entityId, entitySubs);
        }
        let callbacks = entitySubs.get(componentName);
        if (!callbacks) {
          callbacks = new Set();
          entitySubs.set(componentName, callbacks);
        }
        callbacks.add(callback);
        return () => {
          callbacks!.delete(callback);
        };
      },
      subscribeSingleton: () => () => {},
      registerTickCallback: () => () => {},
    };
  });

  // Helper to notify subscribers
  function notifySubscribers(entityId: number, componentName: string, value: unknown) {
    const entitySubs = mockSubscriptions.get(entityId);
    if (!entitySubs) return;
    const callbacks = entitySubs.get(componentName);
    if (!callbacks) return;
    for (const callback of callbacks) {
      callback(value);
    }
  }

  // Helper to run composable with provided context
  function withSetup<T>(composable: () => T): T {
    let result: T;

    // Create a parent component that provides the context
    const Provider = defineComponent({
      setup() {
        provide(INFINITE_CANVAS_KEY, mockCanvasContext);
        return () => h(Child);
      },
    });

    // Create a child component that uses the composable
    const Child = defineComponent({
      setup() {
        result = composable();
        return () => h("div");
      },
    });

    const app = createApp(Provider);
    app.mount(document.createElement("div"));
    return result!;
  }

  describe("error handling", () => {
    it("should throw error when used outside InfiniteCanvas", () => {
      // Run without providing canvas context
      expect(() => {
        const app = createApp({
          setup() {
            useComponent(1, TestComponent);
            return () => h("div");
          },
        });
        app.mount(document.createElement("div"));
      }).toThrow("useComponent must be used within an InfiniteCanvas component");
    });
  });

  describe("basic functionality", () => {
    it("should return null when entity does not exist", () => {
      const result = withSetup(() => useComponent(999, TestComponent));
      expect(result.value).toBeNull();
    });

    it("should return null initially when no editor available", () => {
      // Editor is already null in our mock setup
      const result = withSetup(() => useComponent(1, TestComponent));
      expect(result.value).toBeNull();
    });
  });

  describe("reactivity", () => {
    it("should update when component value changes via subscription", () => {
      mockEntities.add(1);
      const result = withSetup(() => useComponent(1, TestComponent));
      expect(result.value).toBeNull();

      // Simulate component being added/changed
      notifySubscribers(1, "TestComponent", { value: 42 });
      expect(result.value).toEqual({ value: 42 });
    });

    it("should update when component is removed (set to null)", () => {
      mockEntities.add(1);
      const result = withSetup(() => useComponent(1, TestComponent));

      // Add component
      notifySubscribers(1, "TestComponent", { value: 10 });
      expect(result.value).toEqual({ value: 10 });

      // Remove component
      notifySubscribers(1, "TestComponent", null);
      expect(result.value).toBeNull();
    });

    it("should update when component is added (from null to value)", () => {
      mockEntities.add(1);
      const result = withSetup(() => useComponent(1, TestComponent));
      expect(result.value).toBeNull();

      // Add component
      notifySubscribers(1, "TestComponent", { value: 30 });
      expect(result.value).toEqual({ value: 30 });
    });
  });

  describe("multiple entities", () => {
    it("should return correct data for different entities", () => {
      mockEntities.add(1);
      mockEntities.add(2);

      const result1 = withSetup(() => useComponent(1, TestComponent));
      const result2 = withSetup(() => useComponent(2, TestComponent));

      notifySubscribers(1, "TestComponent", { value: 100 });
      notifySubscribers(2, "TestComponent", { value: 200 });

      expect(result1.value).toEqual({ value: 100 });
      expect(result2.value).toEqual({ value: 200 });
    });

    it("should handle mixed presence of components across entities", () => {
      mockEntities.add(1);
      mockEntities.add(2);

      const result1 = withSetup(() => useComponent(1, TestComponent));
      const result2 = withSetup(() => useComponent(2, TestComponent));

      notifySubscribers(1, "TestComponent", { value: 100 });
      // Entity 2 has no component

      expect(result1.value).toEqual({ value: 100 });
      expect(result2.value).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("should unsubscribe on unmount", () => {
      mockEntities.add(1);

      let result: ReturnType<typeof useComponent>;
      const Child = defineComponent({
        setup() {
          result = useComponent(1, TestComponent);
          return () => h("div");
        },
      });

      const Provider = defineComponent({
        setup() {
          provide(INFINITE_CANVAS_KEY, mockCanvasContext);
          return () => h(Child);
        },
      });

      const app = createApp(Provider);
      app.mount(document.createElement("div"));

      // Should have subscription
      expect(mockSubscriptions.get(1)?.get("TestComponent")?.size).toBe(1);

      // Unmount
      app.unmount();

      // Subscription should be removed
      expect(mockSubscriptions.get(1)?.get("TestComponent")?.size).toBe(0);
    });
  });
});
