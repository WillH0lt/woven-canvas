import { describe, it, expect, vi, beforeEach } from "vitest";
import { field, World } from "../src/index.js";

describe("Component", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe("Component Definition", () => {
    it("should create a component with string fields", () => {
      const User = world.createComponent({
        name: field.string().max(50),
        email: field.string().max(100),
      });

      const user = User._from({ name: "Alice", email: "alice@example.com" });

      // Direct property access via .value
      expect(user.value.name).toBe("Alice");
      expect(user.value.email).toBe("alice@example.com");
    });

    it("should create a component with numeric fields", () => {
      const Position = world.createComponent({
        x: field.float32(),
        y: field.float32(),
        z: field.float32(),
      });

      const pos = Position._from({ x: 1.5, y: 2.5, z: 3.5 });

      // Direct property access via .value
      expect(pos.value.x).toBeCloseTo(1.5);
      expect(pos.value.y).toBeCloseTo(2.5);
      expect(pos.value.z).toBeCloseTo(3.5);
    });

    it("should create a component with mixed field types", () => {
      const Player = world.createComponent({
        name: field.string().max(30),
        health: field.uint8(),
        score: field.uint32(),
        speed: field.float32(),
      });

      const player = Player._from({
        name: "Bob",
        health: 100,
        score: 1500,
        speed: 5.5,
      });

      // Direct property access via .value
      expect(player.value.name).toBe("Bob");
      expect(player.value.health).toBe(100);
      expect(player.value.score).toBe(1500);
      expect(player.value.speed).toBeCloseTo(5.5);
    });

    it("should support default values", () => {
      const Config = world.createComponent({
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
        label: field.string().max(20).default("default"),
      });

      const config = Config._from({});

      // Direct property access via .value
      expect(config.value.enabled).toBe(true);
      expect(config.value.maxCount).toBe(100);
      expect(config.value.label).toBe("default");
    });

    it("should override default values when provided", () => {
      const Config = world.createComponent({
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
      });

      const config = Config._from({ enabled: false, maxCount: 50 });

      // Direct property access via .value
      expect(config.value.enabled).toBe(false);
      expect(config.value.maxCount).toBe(50);
    });
  });

  describe("Component Instance Operations", () => {
    it("should allow setting values via direct property assignment", () => {
      const Counter = world.createComponent({
        count: field.uint32(),
      });

      const counter = Counter._from({ count: 0 });
      expect(counter.value.count).toBe(0);

      // Direct property assignment via .value
      counter.value.count = 42;
      expect(counter.value.count).toBe(42);
    });
  });

  describe("All Numeric Types", () => {
    it("should support uint8", () => {
      const C = world.createComponent({ val: field.uint8() });
      const c = C._from({ val: 255 });
      expect(c.value.val).toBe(255);
    });

    it("should support uint16", () => {
      const C = world.createComponent({ val: field.uint16() });
      const c = C._from({ val: 65535 });
      expect(c.value.val).toBe(65535);
    });

    it("should support uint32", () => {
      const C = world.createComponent({ val: field.uint32() });
      const c = C._from({ val: 4294967295 });
      expect(c.value.val).toBe(4294967295);
    });

    it("should support int8", () => {
      const C = world.createComponent({ val: field.int8() });
      const c = C._from({ val: -128 });
      expect(c.value.val).toBe(-128);
    });

    it("should support int16", () => {
      const C = world.createComponent({ val: field.int16() });
      const c = C._from({ val: -32768 });
      expect(c.value.val).toBe(-32768);
    });

    it("should support int32", () => {
      const C = world.createComponent({ val: field.int32() });
      const c = C._from({ val: -2147483648 });
      expect(c.value.val).toBe(-2147483648);
    });

    it("should support float32", () => {
      const C = world.createComponent({ val: field.float32() });
      const c = C._from({ val: 3.14159 });
      expect(c.value.val).toBeCloseTo(3.14159, 5);
    });

    it("should support float64", () => {
      const C = world.createComponent({ val: field.float64() });
      const c = C._from({ val: 3.141592653589793 });
      expect(c.value.val).toBeCloseTo(3.141592653589793, 15);
    });
  });

  describe("TypeScript Type Inference", () => {
    it("should provide correct types for component properties", () => {
      const TestComponent = world.createComponent({
        name: field.string().max(20),
        count: field.uint32(),
        ratio: field.float32(),
        enabled: field.boolean(),
      });

      const instance = TestComponent._from({
        name: "test",
        count: 42,
        ratio: 0.5,
        enabled: true,
      });

      // These should all be properly typed via .value
      const name: string = instance.value.name;
      const count: number = instance.value.count;
      const ratio: number = instance.value.ratio;
      const enabled: boolean = instance.value.enabled;

      expect(name).toBe("test");
      expect(count).toBe(42);
      expect(ratio).toBeCloseTo(0.5);
      expect(enabled).toBe(true);
    });
  });

  describe("From Function Validation", () => {
    it("should use defaults for missing fields when defaults are defined", () => {
      const Config = world.createComponent({
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
        label: field.string().max(20).default("default"),
      });

      const config = Config._from({});

      expect(config.value.enabled).toBe(true);
      expect(config.value.maxCount).toBe(100);
      expect(config.value.label).toBe("default");
    });

    it("should use type-based fallbacks for missing fields without defaults", () => {
      const Entity = world.createComponent({
        name: field.string().max(20),
        count: field.uint32(),
        active: field.boolean(),
      });

      const entity = Entity._from({});

      expect(entity.value.name).toBe("");
      expect(entity.value.count).toBe(0);
      expect(entity.value.active).toBe(false);
    });

    it("should use defaults over type fallbacks when available", () => {
      const Mixed = world.createComponent({
        withDefault: field.uint32().default(42),
        withoutDefault: field.uint32(),
      });

      const mixed = Mixed._from({});

      expect(mixed.value.withDefault).toBe(42);
      expect(mixed.value.withoutDefault).toBe(0);
    });

    it("should use provided values over defaults", () => {
      const Config = world.createComponent({
        enabled: field.boolean().default(true),
        count: field.uint32().default(10),
      });

      const config = Config._from({
        enabled: false,
        count: 5,
      });

      expect(config.value.enabled).toBe(false);
      expect(config.value.count).toBe(5);
    });

    it("should handle partially missing fields correctly", () => {
      const Player = world.createComponent({
        name: field.string().max(20).default("Unknown"),
        health: field.uint8(),
        score: field.uint32().default(0),
      });

      const player = Player._from({ name: "Bob" });

      expect(player.value.name).toBe("Bob");
      expect(player.value.health).toBe(0);
      expect(player.value.score).toBe(0);
    });

    it("should throw error for non-object input", () => {
      const Simple = world.createComponent({
        value: field.uint8(),
      });

      expect(() => Simple._from(null)).toThrow(
        "Invalid input: expected an object"
      );
      expect(() => Simple._from(undefined)).toThrow(
        "Invalid input: expected an object"
      );
      expect(() => Simple._from(42)).toThrow(
        "Invalid input: expected an object"
      );
      expect(() => Simple._from("string")).toThrow(
        "Invalid input: expected an object"
      );
      // Arrays are technically objects in JavaScript, so they don't throw
      // but they won't have the expected properties
    });

    it("should work with all numeric types", () => {
      const AllTypes = world.createComponent({
        u8: field.uint8(),
        u16: field.uint16(),
        u32: field.uint32(),
        i8: field.int8(),
        i16: field.int16(),
        i32: field.int32(),
        f32: field.float32(),
        f64: field.float64(),
      });

      const instance = AllTypes._from({});

      expect(instance.value.u8).toBe(0);
      expect(instance.value.u16).toBe(0);
      expect(instance.value.u32).toBe(0);
      expect(instance.value.i8).toBe(0);
      expect(instance.value.i16).toBe(0);
      expect(instance.value.i32).toBe(0);
      expect(instance.value.f32).toBe(0);
      expect(instance.value.f64).toBe(0);
    });
  });
});
