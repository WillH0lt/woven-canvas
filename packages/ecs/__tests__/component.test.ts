import { describe, it, expect } from "vitest";
import {
  field,
  defineComponent,
  World,
  createEntity,
  addComponent,
} from "../src";

describe("Component", () => {
  describe("Component Lifecycle", () => {
    it("should allow the same ComponentDef to be used with multiple worlds", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world1 = new World([Position]);
      const ctx1 = world1._getContext();

      const world2 = new World([Position]);
      const ctx2 = world2._getContext();

      // Both worlds should have the component
      expect(Position.getComponentId(ctx1)).toBe(0);
      expect(Position.getComponentId(ctx2)).toBe(0);
    });

    it("should assign unique componentIds to components", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World([Position, Velocity]);
      const ctx = world._getContext();

      expect(Position.getComponentId(ctx)).toBe(0);
      expect(Velocity.getComponentId(ctx)).toBe(1);
    });
  });

  describe("Component Definition", () => {
    it("should create a component with string fields", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
        email: field.string().max(100),
      });
      const world = new World([User]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, User, {
        name: "Alice",
        email: "alice@example.com",
      });
      const user = User.read(ctx, entityId);

      expect(user.name).toBe("Alice");
      expect(user.email).toBe("alice@example.com");
    });

    it("should create a component with numeric fields", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
        z: field.float32(),
      });
      const world = new World([Position]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Position, { x: 1.5, y: 2.5, z: 3.5 });
      const pos = Position.read(ctx, entityId);

      expect(pos.x).toBeCloseTo(1.5);
      expect(pos.y).toBeCloseTo(2.5);
      expect(pos.z).toBeCloseTo(3.5);
    });

    it("should create a component with mixed field types", () => {
      const Player = defineComponent("Player", {
        name: field.string().max(30),
        health: field.uint8(),
        score: field.uint32(),
        speed: field.float32(),
      });
      const world = new World([Player]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Player, {
        name: "Bob",
        health: 100,
        score: 1500,
        speed: 5.5,
      });
      const player = Player.read(ctx, entityId);

      expect(player.name).toBe("Bob");
      expect(player.health).toBe(100);
      expect(player.score).toBe(1500);
      expect(player.speed).toBeCloseTo(5.5);
    });

    it("should support default values", () => {
      const Config = defineComponent("Config", {
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
        label: field.string().max(20).default("default"),
      });
      const world = new World([Config]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Config, {});
      const config = Config.read(ctx, entityId);

      expect(config.enabled).toBe(true);
      expect(config.maxCount).toBe(100);
      expect(config.label).toBe("default");
    });

    it("should override default values when provided", () => {
      const Config = defineComponent("Config", {
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
      });
      const world = new World([Config]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Config, { enabled: false, maxCount: 50 });
      const config = Config.read(ctx, entityId);

      expect(config.enabled).toBe(false);
      expect(config.maxCount).toBe(50);
    });
  });

  describe("Read and Write Operations", () => {
    it("should allow reading and writing component values", () => {
      const Counter = defineComponent("Counter", {
        count: field.uint32(),
      });
      const world = new World([Counter]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Counter, { count: 0 });

      expect(Counter.read(ctx, entityId).count).toBe(0);

      Counter.write(ctx, entityId).count = 42;
      expect(Counter.read(ctx, entityId).count).toBe(42);
    });

    it("should handle updates without affecting other entities", () => {
      const Counter = defineComponent("Counter", {
        value: field.uint32(),
      });
      const world = new World([Counter]);
      const ctx = world._getContext();

      const entity1 = createEntity(ctx);
      const entity2 = createEntity(ctx);
      addComponent(ctx, entity1, Counter, { value: 10 });
      addComponent(ctx, entity2, Counter, { value: 20 });

      Counter.write(ctx, entity1).value = 100;

      expect(Counter.read(ctx, entity1).value).toBe(100);
      expect(Counter.read(ctx, entity2).value).toBe(20);
    });

    it("should create a plain object snapshot that is independent of entity binding", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World([Position]);
      const ctx = world._getContext();

      const entity1 = createEntity(ctx);
      const entity2 = createEntity(ctx);
      addComponent(ctx, entity1, Position, { x: 100, y: 200 });
      addComponent(ctx, entity2, Position, { x: 1, y: 2 });

      // Take snapshot of entity1
      const snapshot1 = Position.snapshot(ctx, entity1);

      // Verify snapshot has correct values
      expect(snapshot1.x).toBeCloseTo(100);
      expect(snapshot1.y).toBeCloseTo(200);

      // Read entity2 (which would change the master object binding)
      const _read2 = Position.read(ctx, entity2);

      // Snapshot should still have entity1's values (it's a plain object copy)
      expect(snapshot1.x).toBeCloseTo(100);
      expect(snapshot1.y).toBeCloseTo(200);

      // Verify it's a plain object (no getters)
      const descriptor = Object.getOwnPropertyDescriptor(snapshot1, "x");
      expect(descriptor?.get).toBeUndefined();
      expect(descriptor?.value).toBeCloseTo(100);
    });

    it("should allow spreading snapshot without the getter footgun", () => {
      const Velocity = defineComponent("Velocity", {
        dx: field.float32(),
        dy: field.float32(),
      });
      const world = new World([Velocity]);
      const ctx = world._getContext();

      const entity1 = createEntity(ctx);
      const entity2 = createEntity(ctx);
      addComponent(ctx, entity1, Velocity, { dx: 10, dy: 20 });
      addComponent(ctx, entity2, Velocity, { dx: 1, dy: 2 });

      // Store snapshots in an external state object
      const state: Record<number, { dx: number; dy: number }> = {};
      state[entity1] = Velocity.snapshot(ctx, entity1);
      state[entity2] = Velocity.snapshot(ctx, entity2);

      // Verify both snapshots have correct independent values
      expect(state[entity1].dx).toBeCloseTo(10);
      expect(state[entity1].dy).toBeCloseTo(20);
      expect(state[entity2].dx).toBeCloseTo(1);
      expect(state[entity2].dy).toBeCloseTo(2);

      // Spread the snapshot
      const spread = { ...state[entity1] };
      expect(spread.dx).toBeCloseTo(10);
      expect(spread.dy).toBeCloseTo(20);
    });
  });

  describe("Numeric Field Types", () => {
    it("should support all numeric types with correct ranges", () => {
      const AllTypes = defineComponent("AllTypes", {
        u8: field.uint8(),
        u16: field.uint16(),
        u32: field.uint32(),
        i8: field.int8(),
        i16: field.int16(),
        i32: field.int32(),
        f32: field.float32(),
        f64: field.float64(),
      });
      const world = new World([AllTypes]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, AllTypes, {
        u8: 255,
        u16: 65535,
        u32: 4294967295,
        i8: -128,
        i16: -32768,
        i32: -2147483648,
        f32: 3.14159,
        f64: 3.141592653589793,
      });
      const values = AllTypes.read(ctx, entityId);

      expect(values.u8).toBe(255);
      expect(values.u16).toBe(65535);
      expect(values.u32).toBe(4294967295);
      expect(values.i8).toBe(-128);
      expect(values.i16).toBe(-32768);
      expect(values.i32).toBe(-2147483648);
      expect(values.f32).toBeCloseTo(3.14159, 5);
      expect(values.f64).toBeCloseTo(3.141592653589793, 15);
    });

    it("should default numeric fields to 0 when not provided", () => {
      const AllTypes = defineComponent("AllTypes", {
        u8: field.uint8(),
        u16: field.uint16(),
        u32: field.uint32(),
        i8: field.int8(),
        i16: field.int16(),
        i32: field.int32(),
        f32: field.float32(),
        f64: field.float64(),
      });
      const world = new World([AllTypes]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, AllTypes, {});
      const values = AllTypes.read(ctx, entityId);

      expect(values.u8).toBe(0);
      expect(values.u16).toBe(0);
      expect(values.u32).toBe(0);
      expect(values.i8).toBe(0);
      expect(values.i16).toBe(0);
      expect(values.i32).toBe(0);
      expect(values.f32).toBe(0);
      expect(values.f64).toBe(0);
    });
  });

  describe("Boolean Field Handling", () => {
    it("should store and retrieve boolean values", () => {
      const Flags = defineComponent("Flags", {
        isActive: field.boolean(),
        isVisible: field.boolean(),
        isEnabled: field.boolean(),
      });
      const world = new World([Flags]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Flags, {
        isActive: true,
        isVisible: false,
        isEnabled: true,
      });
      const flags = Flags.read(ctx, entityId);

      expect(flags.isActive).toBe(true);
      expect(flags.isVisible).toBe(false);
      expect(flags.isEnabled).toBe(true);
    });

    it("should default boolean fields to false when not provided", () => {
      const Flags = defineComponent("Flags", {
        flag: field.boolean(),
      });
      const world = new World([Flags]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Flags, {});
      const flags = Flags.read(ctx, entityId);

      expect(flags.flag).toBe(false);
    });

    it("should allow updating boolean values", () => {
      const Flags = defineComponent("Flags", {
        isActive: field.boolean(),
      });
      const world = new World([Flags]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Flags, { isActive: false });
      expect(Flags.read(ctx, entityId).isActive).toBe(false);

      Flags.write(ctx, entityId).isActive = true;
      expect(Flags.read(ctx, entityId).isActive).toBe(true);
    });
  });

  describe("TypeScript Type Inference", () => {
    it("should provide correct types for component properties", () => {
      const TestComponent = defineComponent("TestComponent", {
        name: field.string().max(20),
        count: field.uint32(),
        ratio: field.float32(),
        enabled: field.boolean(),
      });
      const world = new World([TestComponent]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, TestComponent, {
        name: "test",
        count: 42,
        ratio: 0.5,
        enabled: true,
      });
      const instance = TestComponent.read(ctx, entityId);

      const name: string = instance.name;
      const count: number = instance.count;
      const ratio: number = instance.ratio;
      const enabled: boolean = instance.enabled;

      expect(name).toBe("test");
      expect(count).toBe(42);
      expect(ratio).toBeCloseTo(0.5);
      expect(enabled).toBe(true);
    });
  });

  describe("String Field Handling", () => {
    it("should default to empty string when not provided", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
      });
      const world = new World([User]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, User, {});
      const user = User.read(ctx, entityId);

      expect(user.name).toBe("");
    });

    it("should handle special characters and unicode", () => {
      const Data = defineComponent("Data", {
        text: field.string().max(100),
      });
      const world = new World([Data]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const specialString = "Hello! 👋 @#$%^&*() 日本語";
      addComponent(ctx, entityId, Data, { text: specialString });
      const data = Data.read(ctx, entityId);

      expect(data.text).toBe(specialString);
    });

    it("should handle multiple entities with different strings", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
      });
      const world = new World([User]);
      const ctx = world._getContext();

      const entity1 = createEntity(ctx);
      const entity2 = createEntity(ctx);
      const entity3 = createEntity(ctx);

      addComponent(ctx, entity1, User, { name: "Alice" });
      addComponent(ctx, entity2, User, { name: "Bob" });
      addComponent(ctx, entity3, User, { name: "Charlie" });

      expect(User.read(ctx, entity1).name).toBe("Alice");
      expect(User.read(ctx, entity2).name).toBe("Bob");
      expect(User.read(ctx, entity3).name).toBe("Charlie");
    });

    it("should truncate strings that exceed maxLength", () => {
      const Data = defineComponent("Data", {
        shortText: field.string().max(10),
      });
      const world = new World([Data]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const longString = "This is a very long string";
      addComponent(ctx, entityId, Data, { shortText: longString });

      const data = Data.read(ctx, entityId);
      expect(data.shortText.length).toBeLessThanOrEqual(10);
      expect(data.shortText).toBe(longString.substring(0, 10));
    });

    it("should encode string length in buffer for stateless operation", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
      });
      const world = new World([User]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const testString = "Hello World";
      addComponent(ctx, entityId, User, { name: testString });

      const buffer = (User._getInstance(ctx).buffer as any).name.getBuffer();
      const offset = entityId * 54; // 50 data + 4 length header
      const storedLength =
        buffer[offset] |
        (buffer[offset + 1] << 8) |
        (buffer[offset + 2] << 16) |
        (buffer[offset + 3] << 24);

      expect(storedLength).toBe(11);
      expect(User.read(ctx, entityId).name).toBe(testString);
    });
  });
  describe("Default Value Handling", () => {
    it("should use defaults for missing fields when defined", () => {
      const Config = defineComponent("Config", {
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
        label: field.string().max(20).default("default"),
      });
      const world = new World([Config]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Config, {});
      const config = Config.read(ctx, entityId);

      expect(config.enabled).toBe(true);
      expect(config.maxCount).toBe(100);
      expect(config.label).toBe("default");
    });

    it("should use type-based fallbacks when no defaults defined", () => {
      const Entity = defineComponent("Entity", {
        name: field.string().max(20),
        count: field.uint32(),
        active: field.boolean(),
      });
      const world = new World([Entity]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Entity, {});
      const entity = Entity.read(ctx, entityId);

      expect(entity.name).toBe("");
      expect(entity.count).toBe(0);
      expect(entity.active).toBe(false);
    });

    it("should prefer provided values over defaults", () => {
      const Config = defineComponent("Config", {
        enabled: field.boolean().default(true),
        count: field.uint32().default(10),
      });
      const world = new World([Config]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Config, {
        enabled: false,
        count: 5,
      });
      const config = Config.read(ctx, entityId);

      expect(config.enabled).toBe(false);
      expect(config.count).toBe(5);
    });
  });

  describe("Binary Field Handling", () => {
    it("should store and retrieve binary data", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      addComponent(ctx, entityId, BinaryData, { data: testData });
      const result = BinaryData.read(ctx, entityId);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(8);
      expect(Array.from(result.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("should default to empty Uint8Array when not provided", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, BinaryData, {});
      const result = BinaryData.read(ctx, entityId);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(0);
    });

    it("should use default binary value when provided", () => {
      const defaultData = new Uint8Array([0xff, 0xfe, 0xfd]);
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128).default(defaultData),
      });
      const world = new World([BinaryData]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, BinaryData, {});
      const result = BinaryData.read(ctx, entityId);

      expect(Array.from(result.data)).toEqual([0xff, 0xfe, 0xfd]);
    });

    it("should allow updating binary data", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, BinaryData, {
        data: new Uint8Array([1, 2, 3]),
      });

      BinaryData.write(ctx, entityId).data = new Uint8Array([4, 5, 6, 7]);

      const result = BinaryData.read(ctx, entityId);
      expect(Array.from(result.data)).toEqual([4, 5, 6, 7]);
    });

    it("should return copies to prevent mutations", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, BinaryData, {
        data: new Uint8Array([1, 2, 3, 4, 5]),
      });

      const read1 = BinaryData.read(ctx, entityId);
      const read2 = BinaryData.read(ctx, entityId);

      expect(read1.data).not.toBe(read2.data);
      expect(Array.from(read1.data)).toEqual(Array.from(read2.data));

      read1.data[0] = 99;
      const read3 = BinaryData.read(ctx, entityId);
      expect(read3.data[0]).toBe(1);
    });

    it("should handle multiple entities with different binary data", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);
      const ctx = world._getContext();

      const entity1 = createEntity(ctx);
      const entity2 = createEntity(ctx);

      addComponent(ctx, entity1, BinaryData, {
        data: new Uint8Array([1, 2, 3]),
      });
      addComponent(ctx, entity2, BinaryData, {
        data: new Uint8Array([4, 5, 6, 7, 8]),
      });

      expect(Array.from(BinaryData.read(ctx, entity1).data)).toEqual([1, 2, 3]);
      expect(Array.from(BinaryData.read(ctx, entity2).data)).toEqual([
        4, 5, 6, 7, 8,
      ]);
    });

    it("should truncate binary data that exceeds maxLength", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(20),
      });
      const world = new World([BinaryData]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const largeData = new Uint8Array(100).fill(42);
      addComponent(ctx, entityId, BinaryData, { data: largeData });

      const result = BinaryData.read(ctx, entityId);
      expect(result.data.length).toBeLessThanOrEqual(20);
      expect(result.data.every((b: number) => b === 42)).toBe(true);
    });

    it("should handle binary data in mixed components", () => {
      const NetworkPacket = defineComponent("NetworkPacket", {
        packetId: field.uint32(),
        payload: field.binary().max(512),
        timestamp: field.float64(),
        sender: field.string().max(50),
      });
      const world = new World([NetworkPacket]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const payload = new Uint8Array([
        0x01, 0x02, 0x48, 0x65, 0x6c, 0x6c, 0x6f,
      ]);

      addComponent(ctx, entityId, NetworkPacket, {
        packetId: 12345,
        payload: payload,
        timestamp: Date.now(),
        sender: "server",
      });

      const result = NetworkPacket.read(ctx, entityId);
      expect(result.packetId).toBe(12345);
      expect(Array.from(result.payload)).toEqual([
        0x01, 0x02, 0x48, 0x65, 0x6c, 0x6c, 0x6f,
      ]);
      expect(result.sender).toBe("server");
    });

    it("should encode binary length in buffer for stateless operation", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const testData = new Uint8Array([10, 20, 30, 40, 50]);
      addComponent(ctx, entityId, BinaryData, { data: testData });

      const buffer = BinaryData._getInstance(ctx).buffer.data.getBuffer();
      const offset = entityId * 132; // 128 data + 4 length header
      const storedLength =
        buffer[offset] |
        (buffer[offset + 1] << 8) |
        (buffer[offset + 2] << 16) |
        (buffer[offset + 3] << 24);

      expect(storedLength).toBe(5);
      expect(buffer[offset + 4]).toBe(10);
      expect(buffer[offset + 5]).toBe(20);
      expect(buffer[offset + 6]).toBe(30);
    });
  });

  describe("Array Field Handling", () => {
    it("should throw error when using nested array as element type", () => {
      expect(() => {
        field.array(field.array(field.float32(), 10) as any, 5);
      }).toThrow(/Invalid array element type/);
    });

    it("should throw error when using tuple as element type", () => {
      expect(() => {
        field.array(field.tuple(field.float32(), 2) as any, 5);
      }).toThrow(/Invalid array element type/);
    });

    it("should throw error when using enum as element type", () => {
      const Status = { A: "A", B: "B" } as const;
      expect(() => {
        field.array(field.enum(Status) as any, 5);
      }).toThrow(/Invalid array element type/);
    });

    it("should throw error when using ref as element type", () => {
      expect(() => {
        field.array(field.ref() as any, 5);
      }).toThrow(/Invalid array element type/);
    });

    it("should throw error when element builder is not an object", () => {
      expect(() => {
        field.array(123 as any, 5);
      }).toThrow();
    });

    it("should store and retrieve array data", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 1024),
      });
      const world = new World([Polygon]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const points = [1.5, 2.5, 3.5, 4.5, 5.5];
      addComponent(ctx, entityId, Polygon, { pts: points });

      const result = Polygon.read(ctx, entityId);
      expect(result.pts).toEqual(points);
    });

    it("should default to empty array when not provided", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 100),
      });
      const world = new World([Polygon]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Polygon, {});

      const result = Polygon.read(ctx, entityId);
      expect(result.pts).toEqual([]);
    });

    it("should use default array value when provided", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 100).default([1.0, 2.0, 3.0]),
      });
      const world = new World([Polygon]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Polygon, {});

      const result = Polygon.read(ctx, entityId);
      expect(result.pts).toEqual([1.0, 2.0, 3.0]);
    });

    it("should allow updating array data", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 100),
      });
      const world = new World([Polygon]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Polygon, { pts: [1.0, 2.0] });

      const polygon = Polygon.write(ctx, entityId);
      polygon.pts = [10.0, 20.0, 30.0];

      const result = Polygon.read(ctx, entityId);
      expect(result.pts).toEqual([10.0, 20.0, 30.0]);
    });

    it("should handle multiple entities with different arrays", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 100),
      });
      const world = new World([Polygon]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      const e2 = createEntity(ctx);

      addComponent(ctx, e1, Polygon, { pts: [1.0, 2.0] });
      addComponent(ctx, e2, Polygon, { pts: [3.0, 4.0, 5.0] });

      expect(Polygon.read(ctx, e1).pts).toEqual([1.0, 2.0]);
      expect(Polygon.read(ctx, e2).pts).toEqual([3.0, 4.0, 5.0]);
    });

    it("should truncate arrays that exceed maxLength", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 5),
      });
      const world = new World([Polygon]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const largeArray = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
      addComponent(ctx, entityId, Polygon, { pts: largeArray });

      const result = Polygon.read(ctx, entityId);
      expect(result.pts.length).toBe(5);
      expect(result.pts).toEqual([1.0, 2.0, 3.0, 4.0, 5.0]);
    });

    it("should support different numeric array types", () => {
      const MixedArrays = defineComponent("MixedArrays", {
        floats: field.array(field.float32(), 10),
        ints: field.array(field.int32(), 10),
        bytes: field.array(field.uint8(), 10),
      });
      const world = new World([MixedArrays]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, MixedArrays, {
        floats: [1.5, 2.5, 3.5],
        ints: [-10, 0, 10],
        bytes: [255, 128, 0],
      });

      const result = MixedArrays.read(ctx, entityId);
      expect(result.floats).toEqual([1.5, 2.5, 3.5]);
      expect(result.ints).toEqual([-10, 0, 10]);
      expect(result.bytes).toEqual([255, 128, 0]);
    });

    it("should handle arrays in mixed components", () => {
      const Shape = defineComponent("Shape", {
        id: field.uint32(),
        name: field.string().max(50),
        pts: field.array(field.float32(), 100),
        visible: field.boolean(),
      });
      const world = new World([Shape]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Shape, {
        id: 42,
        name: "triangle",
        pts: [0.0, 0.0, 1.0, 0.0, 0.5, 1.0],
        visible: true,
      });

      const result = Shape.read(ctx, entityId);
      expect(result.id).toBe(42);
      expect(result.name).toBe("triangle");
      expect(result.pts).toEqual([0.0, 0.0, 1.0, 0.0, 0.5, 1.0]);
      expect(result.visible).toBe(true);
    });

    it("should store and retrieve string arrays", () => {
      const Tags = defineComponent("Tags", {
        names: field.array(field.string().max(50), 10),
      });
      const world = new World([Tags]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Tags, {
        names: ["alpha", "beta", "gamma"],
      });

      const result = Tags.read(ctx, entityId);
      expect(result.names).toEqual(["alpha", "beta", "gamma"]);
    });

    it("should store and retrieve boolean arrays", () => {
      const Flags = defineComponent("Flags", {
        bits: field.array(field.boolean(), 8),
      });
      const world = new World([Flags]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Flags, {
        bits: [true, false, true, true, false],
      });

      const result = Flags.read(ctx, entityId);
      expect(result.bits).toEqual([true, false, true, true, false]);
    });

    it("should store and retrieve binary arrays", () => {
      const Chunks = defineComponent("Chunks", {
        data: field.array(field.binary().max(32), 5),
      });
      const world = new World([Chunks]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const chunk1 = new Uint8Array([1, 2, 3]);
      const chunk2 = new Uint8Array([4, 5, 6, 7]);
      addComponent(ctx, entityId, Chunks, {
        data: [chunk1, chunk2],
      });

      const result = Chunks.read(ctx, entityId);
      expect(result.data.length).toBe(2);
      expect(Array.from(result.data[0])).toEqual([1, 2, 3]);
      expect(Array.from(result.data[1])).toEqual([4, 5, 6, 7]);
    });

    it("should handle empty strings in string arrays", () => {
      const Tags = defineComponent("Tags", {
        names: field.array(field.string().max(50), 5),
      });
      const world = new World([Tags]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Tags, {
        names: ["hello", "", "world"],
      });

      const result = Tags.read(ctx, entityId);
      expect(result.names).toEqual(["hello", "", "world"]);
    });

    it("should handle mixed element type arrays in same component", () => {
      const MixedComponent = defineComponent("MixedComponent", {
        numbers: field.array(field.float32(), 10),
        strings: field.array(field.string().max(20), 5),
        flags: field.array(field.boolean(), 8),
      });
      const world = new World([MixedComponent]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, MixedComponent, {
        numbers: [1.5, 2.5, 3.5],
        strings: ["a", "b", "c"],
        flags: [true, false, true],
      });

      const result = MixedComponent.read(ctx, entityId);
      expect(result.numbers).toEqual([1.5, 2.5, 3.5]);
      expect(result.strings).toEqual(["a", "b", "c"]);
      expect(result.flags).toEqual([true, false, true]);
    });

    it("should use array default when provided for all element types", () => {
      const Defaults = defineComponent("Defaults", {
        nums: field.array(field.float32(), 10).default([1.0, 2.0, 3.0]),
        strs: field.array(field.string().max(20), 5).default(["a", "b"]),
        flags: field.array(field.boolean(), 8).default([true, false, true]),
        bins: field
          .array(field.binary().max(16), 3)
          .default([new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]),
      });
      const world = new World([Defaults]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Defaults, {});

      const result = Defaults.read(ctx, entityId);
      expect(result.nums).toEqual([1.0, 2.0, 3.0]);
      expect(result.strs).toEqual(["a", "b"]);
      expect(result.flags).toEqual([true, false, true]);
      expect(result.bins.length).toBe(2);
      expect(Array.from(result.bins[0])).toEqual([1, 2]);
      expect(Array.from(result.bins[1])).toEqual([3, 4, 5]);
    });

    it("should prefer array default over element type default", () => {
      const Combo = defineComponent("Combo", {
        nums: field.array(field.float32().default(999), 10).default([1.0, 2.0]),
        strs: field
          .array(field.string().max(20).default("ignored"), 5)
          .default(["used"]),
      });
      const world = new World([Combo]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Combo, {});

      const result = Combo.read(ctx, entityId);
      expect(result.nums).toEqual([1.0, 2.0]);
      expect(result.strs).toEqual(["used"]);
    });
  });

  describe("Enum Field Handling", () => {
    const ShareMode = {
      None: "None",
      ReadOnly: "ReadOnly",
      ReadWrite: "ReadWrite",
    } as const;

    type ShareMode = (typeof ShareMode)[keyof typeof ShareMode];

    const Status = {
      Pending: "Pending",
      Active: "Active",
      Completed: "Completed",
      Cancelled: "Cancelled",
    } as const;

    type Status = (typeof Status)[keyof typeof Status];

    it("should store and retrieve enum values", () => {
      const Document = defineComponent("Document", {
        shareMode: field.enum(ShareMode),
      });
      const world = new World([Document]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Document, { shareMode: ShareMode.ReadOnly });
      const doc = Document.read(ctx, entityId);

      expect(doc.shareMode).toBe("ReadOnly");
    });

    it("should use first enum value as default when no default specified", () => {
      const Document = defineComponent("Document", {
        shareMode: field.enum(ShareMode),
      });
      const world = new World([Document]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Document, {});
      const doc = Document.read(ctx, entityId);

      expect(doc.shareMode).toBe("None");
    });

    it("should use explicit default when provided", () => {
      const Document = defineComponent("Document", {
        shareMode: field.enum(ShareMode).default(ShareMode.ReadWrite),
      });
      const world = new World([Document]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Document, {});
      const doc = Document.read(ctx, entityId);

      expect(doc.shareMode).toBe("ReadWrite");
    });

    it("should allow updating enum values", () => {
      const Task = defineComponent("Task", {
        status: field.enum(Status).default(Status.Pending),
      });
      const world = new World([Task]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Task, {});

      expect(Task.read(ctx, entityId).status).toBe("Pending");

      Task.write(ctx, entityId).status = Status.Active;
      expect(Task.read(ctx, entityId).status).toBe("Active");

      Task.write(ctx, entityId).status = Status.Completed;
      expect(Task.read(ctx, entityId).status).toBe("Completed");
    });

    it("should work with multiple enum fields", () => {
      const Priority = {
        Low: "Low",
        Medium: "Medium",
        High: "High",
      } as const;

      const Item = defineComponent("Item", {
        shareMode: field.enum(ShareMode).default(ShareMode.None),
        status: field.enum(Status).default(Status.Pending),
        priority: field.enum(Priority).default(Priority.Medium),
      });
      const world = new World([Item]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Item, {
        shareMode: ShareMode.ReadWrite,
        status: Status.Active,
        priority: Priority.High,
      });

      const item = Item.read(ctx, entityId);
      expect(item.shareMode).toBe("ReadWrite");
      expect(item.status).toBe("Active");
      expect(item.priority).toBe("High");
    });

    it("should work with mixed field types including enum", () => {
      const Entity = defineComponent("Entity", {
        name: field.string().max(50),
        shareMode: field.enum(ShareMode),
        count: field.uint32(),
        active: field.boolean(),
      });
      const world = new World([Entity]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Entity, {
        name: "TestEntity",
        shareMode: ShareMode.ReadOnly,
        count: 42,
        active: true,
      });

      const entity = Entity.read(ctx, entityId);
      expect(entity.name).toBe("TestEntity");
      expect(entity.shareMode).toBe("ReadOnly");
      expect(entity.count).toBe(42);
      expect(entity.active).toBe(true);
    });

    it("should handle enum values with longer strings", () => {
      const LongEnum = {
        VeryLongEnumValueOne: "VeryLongEnumValueOne",
        AnotherVeryLongEnumValue: "AnotherVeryLongEnumValue",
        ShortValue: "ShortValue",
      } as const;

      const Config = defineComponent("Config", {
        setting: field.enum(LongEnum),
      });
      const world = new World([Config]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Config, {
        setting: LongEnum.AnotherVeryLongEnumValue,
      });

      expect(Config.read(ctx, entityId).setting).toBe(
        "AnotherVeryLongEnumValue"
      );
    });

    it("should isolate enum values between entities", () => {
      const Task = defineComponent("Task", {
        status: field.enum(Status).default(Status.Pending),
      });
      const world = new World([Task]);
      const ctx = world._getContext();

      const entity1 = createEntity(ctx);
      const entity2 = createEntity(ctx);

      addComponent(ctx, entity1, Task, { status: Status.Active });
      addComponent(ctx, entity2, Task, { status: Status.Completed });

      expect(Task.read(ctx, entity1).status).toBe("Active");
      expect(Task.read(ctx, entity2).status).toBe("Completed");

      Task.write(ctx, entity1).status = Status.Cancelled;
      expect(Task.read(ctx, entity1).status).toBe("Cancelled");
      expect(Task.read(ctx, entity2).status).toBe("Completed");
    });

    it("should use alphabetically first value as default (sorted storage)", () => {
      // Values are stored sorted: Active, Cancelled, Completed, Pending
      // So default (index 0) should be "Active"
      const Task = defineComponent("Task", {
        status: field.enum(Status), // No explicit default
      });
      const world = new World([Task]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Task, {});

      // "Active" comes first alphabetically
      expect(Task.read(ctx, entityId).status).toBe("Active");
    });

    it("should have correct TypeScript types for enum values", () => {
      const Document = defineComponent("Document", {
        shareMode: field.enum(ShareMode).default(ShareMode.None),
      });
      const world = new World([Document]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Document, { shareMode: ShareMode.ReadOnly });
      const doc = Document.read(ctx, entityId);

      // This is a compile-time type check - if types are wrong, this wouldn't compile
      const mode: ShareMode = doc.shareMode;
      expect(mode).toBe("ReadOnly");

      // Verify we can assign back to the component
      Document.write(ctx, entityId).shareMode = ShareMode.ReadWrite;
      expect(Document.read(ctx, entityId).shareMode).toBe("ReadWrite");
    });
  });

  describe("Tuple Field Handling", () => {
    it("should throw error when using nested tuple as element type", () => {
      expect(() => {
        field.tuple(field.tuple(field.float32(), 2) as any, 3);
      }).toThrow(/Invalid tuple element type/);
    });

    it("should throw error when using array as element type", () => {
      expect(() => {
        field.tuple(field.array(field.float32(), 10) as any, 3);
      }).toThrow(/Invalid tuple element type/);
    });

    it("should throw error when using enum as element type", () => {
      const Status = { A: "A", B: "B" } as const;
      expect(() => {
        field.tuple(field.enum(Status) as any, 3);
      }).toThrow(/Invalid tuple element type/);
    });

    it("should throw error when using ref as element type", () => {
      expect(() => {
        field.tuple(field.ref() as any, 3);
      }).toThrow(/Invalid tuple element type/);
    });

    it("should throw error when element builder is not an object", () => {
      expect(() => {
        field.tuple("invalid" as any, 3);
      }).toThrow();
    });

    it("should store and retrieve tuple data", () => {
      const Position = defineComponent("Position", {
        coords: field.tuple(field.float32(), 2),
      });
      const world = new World([Position]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Position, { coords: [1.5, 2.5] });

      const result = Position.read(ctx, entityId);
      expect(result.coords).toEqual([1.5, 2.5]);
    });

    it("should default to zeros when not provided", () => {
      const Position = defineComponent("Position", {
        coords: field.tuple(field.float32(), 3),
      });
      const world = new World([Position]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Position, {});

      const result = Position.read(ctx, entityId);
      expect(result.coords).toEqual([0, 0, 0]);
    });

    it("should use default tuple value when provided", () => {
      const Position = defineComponent("Position", {
        coords: field.tuple(field.float32(), 2).default([10, 20]),
      });
      const world = new World([Position]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Position, {});

      const result = Position.read(ctx, entityId);
      expect(result.coords).toEqual([10, 20]);
    });

    it("should allow updating tuple data", () => {
      const Position = defineComponent("Position", {
        coords: field.tuple(field.float32(), 2),
      });
      const world = new World([Position]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Position, { coords: [1.0, 2.0] });

      const position = Position.write(ctx, entityId);
      position.coords = [10.0, 20.0];

      const result = Position.read(ctx, entityId);
      expect(result.coords).toEqual([10.0, 20.0]);
    });

    it("should handle multiple entities with different tuples", () => {
      const Position = defineComponent("Position", {
        coords: field.tuple(field.float32(), 2),
      });
      const world = new World([Position]);
      const ctx = world._getContext();

      const e1 = createEntity(ctx);
      const e2 = createEntity(ctx);

      addComponent(ctx, e1, Position, { coords: [1.0, 2.0] });
      addComponent(ctx, e2, Position, { coords: [3.0, 4.0] });

      expect(Position.read(ctx, e1).coords).toEqual([1.0, 2.0]);
      expect(Position.read(ctx, e2).coords).toEqual([3.0, 4.0]);
    });

    it("should support different numeric tuple types", () => {
      const MixedTuples = defineComponent("MixedTuples", {
        floatPair: field.tuple(field.float32(), 2),
        intTriple: field.tuple(field.int32(), 3),
        byteQuad: field.tuple(field.uint8(), 4),
      });
      const world = new World([MixedTuples]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, MixedTuples, {
        floatPair: [1.5, 2.5],
        intTriple: [-10, 0, 10],
        byteQuad: [255, 128, 64, 0],
      });

      const result = MixedTuples.read(ctx, entityId);
      expect(result.floatPair).toEqual([1.5, 2.5]);
      expect(result.intTriple).toEqual([-10, 0, 10]);
      expect(result.byteQuad).toEqual([255, 128, 64, 0]);
    });

    it("should handle tuples in mixed components", () => {
      const Transform = defineComponent("Transform", {
        id: field.uint32(),
        position: field.tuple(field.float32(), 3),
        rotation: field.tuple(field.float32(), 4),
        active: field.boolean(),
      });
      const world = new World([Transform]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Transform, {
        id: 42,
        position: [1.0, 2.0, 3.0],
        rotation: [0.0, 0.0, 0.0, 1.0],
        active: true,
      });

      const result = Transform.read(ctx, entityId);
      expect(result.id).toBe(42);
      expect(result.position).toEqual([1.0, 2.0, 3.0]);
      expect(result.rotation).toEqual([0.0, 0.0, 0.0, 1.0]);
      expect(result.active).toBe(true);
    });

    it("should store and retrieve string tuples", () => {
      const NamePair = defineComponent("NamePair", {
        names: field.tuple(field.string().max(50), 2),
      });
      const world = new World([NamePair]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, NamePair, {
        names: ["first", "last"],
      });

      const result = NamePair.read(ctx, entityId);
      expect(result.names).toEqual(["first", "last"]);
    });

    it("should store and retrieve boolean tuples", () => {
      const Flags = defineComponent("Flags", {
        bits: field.tuple(field.boolean(), 4),
      });
      const world = new World([Flags]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Flags, {
        bits: [true, false, true, false],
      });

      const result = Flags.read(ctx, entityId);
      expect(result.bits).toEqual([true, false, true, false]);
    });

    it("should store and retrieve binary tuples", () => {
      const DataPair = defineComponent("DataPair", {
        chunks: field.tuple(field.binary().max(32), 2),
      });
      const world = new World([DataPair]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      const chunk1 = new Uint8Array([1, 2, 3]);
      const chunk2 = new Uint8Array([4, 5, 6, 7]);
      addComponent(ctx, entityId, DataPair, {
        chunks: [chunk1, chunk2],
      });

      const result = DataPair.read(ctx, entityId);
      expect(result.chunks.length).toBe(2);
      expect(Array.from(result.chunks[0])).toEqual([1, 2, 3]);
      expect(Array.from(result.chunks[1])).toEqual([4, 5, 6, 7]);
    });

    it("should default string tuples to empty strings", () => {
      const NamePair = defineComponent("NamePair", {
        names: field.tuple(field.string().max(50), 2),
      });
      const world = new World([NamePair]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, NamePair, {});

      const result = NamePair.read(ctx, entityId);
      expect(result.names).toEqual(["", ""]);
    });

    it("should default boolean tuples to false", () => {
      const Flags = defineComponent("Flags", {
        bits: field.tuple(field.boolean(), 3),
      });
      const world = new World([Flags]);
      const ctx = world._getContext();

      const entityId = createEntity(ctx);
      addComponent(ctx, entityId, Flags, {});

      const result = Flags.read(ctx, entityId);
      expect(result.bits).toEqual([false, false, false]);
    });
  });
});
