import { describe, it, expect, beforeEach } from "vitest";
import {
  field,
  defineComponent,
  defineSingleton,
  useSingleton,
  World,
  defineSystem,
} from "../src";

describe("Singleton", () => {
  describe("Singleton Definition", () => {
    it("should create a singleton with numeric fields", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Mouse]);
      const ctx = world.getContext();

      const mouseRef = useSingleton(Mouse);
      const mouse = mouseRef.read(ctx);
      expect(mouse.x).toBe(0);
      expect(mouse.y).toBe(0);
    });

    it("should create a singleton with default values", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32().default(100),
        y: field.float32().default(200),
        pressed: field.boolean().default(false),
      });
      const world = new World([Mouse]);
      const ctx = world.getContext();

      const mouseRef = useSingleton(Mouse);
      const mouse = mouseRef.read(ctx);
      expect(mouse.x).toBeCloseTo(100);
      expect(mouse.y).toBeCloseTo(200);
      expect(mouse.pressed).toBe(false);
    });

    it("should create a singleton with mixed field types", () => {
      const GameState = defineSingleton("GameState", {
        level: field.uint8().default(1),
        score: field.uint32().default(0),
        playerName: field.string().max(50).default("Player"),
        isPaused: field.boolean().default(false),
      });
      const world = new World([GameState]);
      const ctx = world.getContext();

      const stateRef = useSingleton(GameState);
      const state = stateRef.read(ctx);
      expect(state.level).toBe(1);
      expect(state.score).toBe(0);
      expect(state.playerName).toBe("Player");
      expect(state.isPaused).toBe(false);
    });
  });

  describe("Singleton Read/Write", () => {
    it("should read singleton values", () => {
      const Time = defineSingleton("Time", {
        delta: field.float32().default(0.016),
        elapsed: field.float32().default(0),
      });
      const world = new World([Time]);
      const ctx = world.getContext();

      const timeRef = useSingleton(Time);
      const time = timeRef.read(ctx);
      expect(time.delta).toBeCloseTo(0.016);
      expect(time.elapsed).toBe(0);
    });

    it("should write singleton values", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World([Mouse]);
      const ctx = world.getContext();

      const mouseRef = useSingleton(Mouse);
      const mouse = mouseRef.write(ctx);
      mouse.x = 150;
      mouse.y = 250;

      const readMouse = mouseRef.read(ctx);
      expect(readMouse.x).toBeCloseTo(150);
      expect(readMouse.y).toBeCloseTo(250);
    });

    it("should persist writes across multiple reads", () => {
      const Counter = defineSingleton("Counter", {
        value: field.uint32().default(0),
      });
      const world = new World([Counter]);
      const ctx = world.getContext();

      const counterRef = useSingleton(Counter);

      // Write multiple times
      const counter1 = counterRef.write(ctx);
      counter1.value = 10;

      const counter2 = counterRef.write(ctx);
      counter2.value = counter2.value + 5;

      const counter3 = counterRef.read(ctx);
      expect(counter3.value).toBe(15);
    });
  });

  describe("useSingleton API", () => {
    it("should read via useSingleton", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32().default(42),
        y: field.float32().default(24),
      });
      const world = new World([Mouse]);
      const ctx = world.getContext();

      const mouseRef = useSingleton(Mouse);
      const mouse = mouseRef.read(ctx);
      expect(mouse.x).toBeCloseTo(42);
      expect(mouse.y).toBeCloseTo(24);
    });

    it("should write via useSingleton", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World([Mouse]);
      const ctx = world.getContext();

      const mouseRef = useSingleton(Mouse);
      const mouse = mouseRef.write(ctx);
      mouse.x = 100;
      mouse.y = 200;

      const readMouse = mouseRef.read(ctx);
      expect(readMouse.x).toBeCloseTo(100);
      expect(readMouse.y).toBeCloseTo(200);
    });
  });

  describe("Singleton Change Tracking", () => {
    it("should detect when singleton is written", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World([Mouse]);
      const ctx = world.getContext();

      const mouseRef = useSingleton(Mouse);

      // First check - no changes yet (initializes tracker)
      expect(mouseRef.changed(ctx)).toBe(false);

      // Write to singleton
      const mouse = mouseRef.write(ctx);
      mouse.x = 100;

      // Increment tick and check for changes
      ctx.tick++;
      expect(mouseRef.changed(ctx)).toBe(true);
    });

    it("should return false when singleton is not written", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World([Mouse]);
      const ctx = world.getContext();

      const mouseRef = useSingleton(Mouse);

      // Initial check
      expect(mouseRef.changed(ctx)).toBe(false);

      // Only read, don't write
      const mouse = mouseRef.read(ctx);
      void mouse.x;

      // Increment tick and check - should still be false
      ctx.tick++;
      expect(mouseRef.changed(ctx)).toBe(false);
    });

    it("should reset change detection after being checked", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World([Mouse]);
      const ctx = world.getContext();

      const mouseRef = useSingleton(Mouse);

      // First call initializes the tracker - returns false
      expect(mouseRef.changed(ctx)).toBe(false);

      // Write to singleton after tracker is initialized
      const mouse = mouseRef.write(ctx);
      mouse.x = 100;

      // Next tick - changes detected
      ctx.tick++;
      expect(mouseRef.changed(ctx)).toBe(true);

      // Same tick - should return same cached result
      expect(mouseRef.changed(ctx)).toBe(true);

      // Next tick without writes - no changes
      ctx.tick++;
      expect(mouseRef.changed(ctx)).toBe(false);
    });

    it("should allow multiple Singletons to track independently", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World([Mouse]);
      const ctx = world.getContext();

      // Two independent references to the same singleton
      const mouseRef1 = useSingleton(Mouse);
      const mouseRef2 = useSingleton(Mouse);

      // Initialize both trackers
      expect(mouseRef1.changed(ctx)).toBe(false);
      expect(mouseRef2.changed(ctx)).toBe(false);

      // Write to singleton
      const mouse = mouseRef1.write(ctx);
      mouse.x = 100;

      // Next tick - both refs should see the change
      ctx.tick++;
      expect(mouseRef1.changed(ctx)).toBe(true);
      expect(mouseRef2.changed(ctx)).toBe(true);

      // Next tick - neither should see changes
      ctx.tick++;
      expect(mouseRef1.changed(ctx)).toBe(false);
      expect(mouseRef2.changed(ctx)).toBe(false);
    });
  });

  describe("Singleton with Components", () => {
    it("should work alongside regular components", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Position, Mouse]);
      const ctx = world.getContext();

      // Check that both work
      const mouseRef = useSingleton(Mouse);
      const mouse = mouseRef.write(ctx);
      mouse.x = 100;
      mouse.y = 200;

      const readMouse = mouseRef.read(ctx);
      expect(readMouse.x).toBeCloseTo(100);
      expect(readMouse.y).toBeCloseTo(200);

      // Component IDs should be unique
      expect(Position.getComponentId(ctx)).toBe(0);
      expect(Mouse.getComponentId(ctx)).toBe(1);
    });

    it("should assign unique componentIds to singletons", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });
      const Time = defineSingleton("Time", {
        delta: field.float32(),
        elapsed: field.float32(),
      });

      const world = new World([Mouse, Time]);
      const ctx = world.getContext();

      expect(Mouse.getComponentId(ctx)).toBe(0);
      expect(Time.getComponentId(ctx)).toBe(1);
    });
  });

  describe("Singleton in Systems", () => {
    it("should be accessible in defineSystem", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });

      const world = new World([Mouse]);
      const ctx = world.getContext();

      let systemRan = false;
      const mouseRef = useSingleton(Mouse);

      const system = defineSystem((ctx) => {
        const mouse = mouseRef.write(ctx);
        mouse.x = 42;
        mouse.y = 24;
        systemRan = true;
      });

      system.execute(ctx);

      expect(systemRan).toBe(true);
      const mouse = mouseRef.read(ctx);
      expect(mouse.x).toBeCloseTo(42);
      expect(mouse.y).toBeCloseTo(24);
    });
  });

  describe("Singleton Lifecycle", () => {
    it("should allow multiple worlds to use same singleton definition", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });

      const world1 = new World([Mouse]);
      const ctx1 = world1.getContext();

      const world2 = new World([Mouse]);
      const ctx2 = world2.getContext();

      // Each world should have independent singletons
      const mouseRef = useSingleton(Mouse);
      const mouse1 = mouseRef.write(ctx1);
      mouse1.x = 100;

      const mouse2 = mouseRef.write(ctx2);
      mouse2.x = 200;

      expect(mouseRef.read(ctx1).x).toBeCloseTo(100);
      expect(mouseRef.read(ctx2).x).toBeCloseTo(200);
    });

    it("should throw when accessing singleton from wrong context", () => {
      const Mouse = defineSingleton("Mouse", {
        x: field.float32(),
        y: field.float32(),
      });

      // Singleton not registered with this world
      const OtherSingleton = defineSingleton("Other", {
        value: field.float32(),
      });

      const world = new World([Mouse]);
      const ctx = world.getContext();

      const otherRef = useSingleton(OtherSingleton);

      // Direct access without going through useSingleton should throw
      expect(() => {
        otherRef.read(ctx);
      }).toThrow(/is not registered with this World/);
    });
  });
});
