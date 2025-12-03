import { describe, it, expect } from "vitest";
import { field, defineComponent, World } from "../src";

describe("Component", () => {
  describe("Component Lifecycle", () => {
    it("should prevent double initialization", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world1 = new World([Position]);

      expect(() => {
        const world2 = new World([Position]);
      }).toThrow(/already been initialized/);
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

      expect(Position.componentId).toBe(0);
      expect(Velocity.componentId).toBe(1);
    });
  });

  describe("Component Definition", () => {
    it("should create a component with string fields", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
        email: field.string().max(100),
      });
      const world = new World([User]);

      const entityId = world.createEntity();
      world.addComponent(entityId, User, {
        name: "Alice",
        email: "alice@example.com",
      });
      const user = User.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, Position, { x: 1.5, y: 2.5, z: 3.5 });
      const pos = Position.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, Player, {
        name: "Bob",
        health: 100,
        score: 1500,
        speed: 5.5,
      });
      const player = Player.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, {});
      const config = Config.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, { enabled: false, maxCount: 50 });
      const config = Config.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, Counter, { count: 0 });

      expect(Counter.read(entityId).count).toBe(0);

      Counter.write(entityId).count = 42;
      expect(Counter.read(entityId).count).toBe(42);
    });

    it("should handle updates without affecting other entities", () => {
      const Counter = defineComponent("Counter", {
        value: field.uint32(),
      });
      const world = new World([Counter]);

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      world.addComponent(entity1, Counter, { value: 10 });
      world.addComponent(entity2, Counter, { value: 20 });

      Counter.write(entity1).value = 100;

      expect(Counter.read(entity1).value).toBe(100);
      expect(Counter.read(entity2).value).toBe(20);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, AllTypes, {
        u8: 255,
        u16: 65535,
        u32: 4294967295,
        i8: -128,
        i16: -32768,
        i32: -2147483648,
        f32: 3.14159,
        f64: 3.141592653589793,
      });
      const values = AllTypes.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, AllTypes, {});
      const values = AllTypes.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, Flags, {
        isActive: true,
        isVisible: false,
        isEnabled: true,
      });
      const flags = Flags.read(entityId);

      expect(flags.isActive).toBe(true);
      expect(flags.isVisible).toBe(false);
      expect(flags.isEnabled).toBe(true);
    });

    it("should default boolean fields to false when not provided", () => {
      const Flags = defineComponent("Flags", {
        flag: field.boolean(),
      });
      const world = new World([Flags]);

      const entityId = world.createEntity();
      world.addComponent(entityId, Flags, {});
      const flags = Flags.read(entityId);

      expect(flags.flag).toBe(false);
    });

    it("should allow updating boolean values", () => {
      const Flags = defineComponent("Flags", {
        isActive: field.boolean(),
      });
      const world = new World([Flags]);

      const entityId = world.createEntity();
      world.addComponent(entityId, Flags, { isActive: false });
      expect(Flags.read(entityId).isActive).toBe(false);

      Flags.write(entityId).isActive = true;
      expect(Flags.read(entityId).isActive).toBe(true);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, TestComponent, {
        name: "test",
        count: 42,
        ratio: 0.5,
        enabled: true,
      });
      const instance = TestComponent.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, User, {});
      const user = User.read(entityId);

      expect(user.name).toBe("");
    });

    it("should handle special characters and unicode", () => {
      const Data = defineComponent("Data", {
        text: field.string().max(100),
      });
      const world = new World([Data]);

      const entityId = world.createEntity();
      const specialString = "Hello! 👋 @#$%^&*() 日本語";
      world.addComponent(entityId, Data, { text: specialString });
      const data = Data.read(entityId);

      expect(data.text).toBe(specialString);
    });

    it("should handle multiple entities with different strings", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
      });
      const world = new World([User]);

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      world.addComponent(entity1, User, { name: "Alice" });
      world.addComponent(entity2, User, { name: "Bob" });
      world.addComponent(entity3, User, { name: "Charlie" });

      expect(User.read(entity1).name).toBe("Alice");
      expect(User.read(entity2).name).toBe("Bob");
      expect(User.read(entity3).name).toBe("Charlie");
    });

    it("should truncate strings that exceed maxLength", () => {
      const Data = defineComponent("Data", {
        shortText: field.string().max(10),
      });
      const world = new World([Data]);

      const entityId = world.createEntity();
      const longString = "This is a very long string";
      world.addComponent(entityId, Data, { shortText: longString });

      const data = Data.read(entityId);
      expect(data.shortText.length).toBeLessThanOrEqual(10);
      expect(data.shortText).toBe(longString.substring(0, 10));
    });

    it("should encode string length in buffer for stateless operation", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
      });
      const world = new World([User]);

      const entityId = world.createEntity();
      const testString = "Hello World";
      world.addComponent(entityId, User, { name: testString });

      const buffer = (User.buffer as any).name.getBuffer();
      const offset = entityId * 54; // 50 data + 4 length header
      const storedLength =
        buffer[offset] |
        (buffer[offset + 1] << 8) |
        (buffer[offset + 2] << 16) |
        (buffer[offset + 3] << 24);

      expect(storedLength).toBe(11);
      expect(User.read(entityId).name).toBe(testString);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, {});
      const config = Config.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, Entity, {});
      const entity = Entity.read(entityId);

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

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, {
        enabled: false,
        count: 5,
      });
      const config = Config.read(entityId);

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

      const entityId = world.createEntity();
      const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      world.addComponent(entityId, BinaryData, { data: testData });
      const result = BinaryData.read(entityId);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(8);
      expect(Array.from(result.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("should default to empty Uint8Array when not provided", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {});
      const result = BinaryData.read(entityId);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(0);
    });

    it("should use default binary value when provided", () => {
      const defaultData = new Uint8Array([0xff, 0xfe, 0xfd]);
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128).default(defaultData),
      });
      const world = new World([BinaryData]);

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {});
      const result = BinaryData.read(entityId);

      expect(Array.from(result.data)).toEqual([0xff, 0xfe, 0xfd]);
    });

    it("should allow updating binary data", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {
        data: new Uint8Array([1, 2, 3]),
      });

      BinaryData.write(entityId).data = new Uint8Array([4, 5, 6, 7]);

      const result = BinaryData.read(entityId);
      expect(Array.from(result.data)).toEqual([4, 5, 6, 7]);
    });

    it("should return copies to prevent mutations", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {
        data: new Uint8Array([1, 2, 3, 4, 5]),
      });

      const read1 = BinaryData.read(entityId);
      const read2 = BinaryData.read(entityId);

      expect(read1.data).not.toBe(read2.data);
      expect(Array.from(read1.data)).toEqual(Array.from(read2.data));

      read1.data[0] = 99;
      const read3 = BinaryData.read(entityId);
      expect(read3.data[0]).toBe(1);
    });

    it("should handle multiple entities with different binary data", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World([BinaryData]);

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      world.addComponent(entity1, BinaryData, {
        data: new Uint8Array([1, 2, 3]),
      });
      world.addComponent(entity2, BinaryData, {
        data: new Uint8Array([4, 5, 6, 7, 8]),
      });

      expect(Array.from(BinaryData.read(entity1).data)).toEqual([1, 2, 3]);
      expect(Array.from(BinaryData.read(entity2).data)).toEqual([
        4, 5, 6, 7, 8,
      ]);
    });

    it("should truncate binary data that exceeds maxLength", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(20),
      });
      const world = new World([BinaryData]);

      const entityId = world.createEntity();
      const largeData = new Uint8Array(100).fill(42);
      world.addComponent(entityId, BinaryData, { data: largeData });

      const result = BinaryData.read(entityId);
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

      const entityId = world.createEntity();
      const payload = new Uint8Array([
        0x01, 0x02, 0x48, 0x65, 0x6c, 0x6c, 0x6f,
      ]);

      world.addComponent(entityId, NetworkPacket, {
        packetId: 12345,
        payload: payload,
        timestamp: Date.now(),
        sender: "server",
      });

      const result = NetworkPacket.read(entityId);
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

      const entityId = world.createEntity();
      const testData = new Uint8Array([10, 20, 30, 40, 50]);
      world.addComponent(entityId, BinaryData, { data: testData });

      const buffer = BinaryData.buffer.data.getBuffer();
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
    it("should store and retrieve array data", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 1024),
      });
      const world = new World([Polygon]);

      const entityId = world.createEntity();
      const points = [1.5, 2.5, 3.5, 4.5, 5.5];
      world.addComponent(entityId, Polygon, { pts: points });

      const result = Polygon.read(entityId);
      expect(result.pts).toEqual(points);
    });

    it("should default to empty array when not provided", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 100),
      });
      const world = new World([Polygon]);

      const entityId = world.createEntity();
      world.addComponent(entityId, Polygon, {});

      const result = Polygon.read(entityId);
      expect(result.pts).toEqual([]);
    });

    it("should use default array value when provided", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 100).default([1.0, 2.0, 3.0]),
      });
      const world = new World([Polygon]);

      const entityId = world.createEntity();
      world.addComponent(entityId, Polygon, {});

      const result = Polygon.read(entityId);
      expect(result.pts).toEqual([1.0, 2.0, 3.0]);
    });

    it("should allow updating array data", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 100),
      });
      const world = new World([Polygon]);

      const entityId = world.createEntity();
      world.addComponent(entityId, Polygon, { pts: [1.0, 2.0] });

      const polygon = Polygon.write(entityId);
      polygon.pts = [10.0, 20.0, 30.0];

      const result = Polygon.read(entityId);
      expect(result.pts).toEqual([10.0, 20.0, 30.0]);
    });

    it("should handle multiple entities with different arrays", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 100),
      });
      const world = new World([Polygon]);

      const e1 = world.createEntity();
      const e2 = world.createEntity();

      world.addComponent(e1, Polygon, { pts: [1.0, 2.0] });
      world.addComponent(e2, Polygon, { pts: [3.0, 4.0, 5.0] });

      expect(Polygon.read(e1).pts).toEqual([1.0, 2.0]);
      expect(Polygon.read(e2).pts).toEqual([3.0, 4.0, 5.0]);
    });

    it("should truncate arrays that exceed maxLength", () => {
      const Polygon = defineComponent("Polygon", {
        pts: field.array(field.float32(), 5),
      });
      const world = new World([Polygon]);

      const entityId = world.createEntity();
      const largeArray = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
      world.addComponent(entityId, Polygon, { pts: largeArray });

      const result = Polygon.read(entityId);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, MixedArrays, {
        floats: [1.5, 2.5, 3.5],
        ints: [-10, 0, 10],
        bytes: [255, 128, 0],
      });

      const result = MixedArrays.read(entityId);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, Shape, {
        id: 42,
        name: "triangle",
        pts: [0.0, 0.0, 1.0, 0.0, 0.5, 1.0],
        visible: true,
      });

      const result = Shape.read(entityId);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, Tags, {
        names: ["alpha", "beta", "gamma"],
      });

      const result = Tags.read(entityId);
      expect(result.names).toEqual(["alpha", "beta", "gamma"]);
    });

    it("should store and retrieve boolean arrays", () => {
      const Flags = defineComponent("Flags", {
        bits: field.array(field.boolean(), 8),
      });
      const world = new World([Flags]);

      const entityId = world.createEntity();
      world.addComponent(entityId, Flags, {
        bits: [true, false, true, true, false],
      });

      const result = Flags.read(entityId);
      expect(result.bits).toEqual([true, false, true, true, false]);
    });

    it("should store and retrieve binary arrays", () => {
      const Chunks = defineComponent("Chunks", {
        data: field.array(field.binary().max(32), 5),
      });
      const world = new World([Chunks]);

      const entityId = world.createEntity();
      const chunk1 = new Uint8Array([1, 2, 3]);
      const chunk2 = new Uint8Array([4, 5, 6, 7]);
      world.addComponent(entityId, Chunks, {
        data: [chunk1, chunk2],
      });

      const result = Chunks.read(entityId);
      expect(result.data.length).toBe(2);
      expect(Array.from(result.data[0])).toEqual([1, 2, 3]);
      expect(Array.from(result.data[1])).toEqual([4, 5, 6, 7]);
    });

    it("should handle empty strings in string arrays", () => {
      const Tags = defineComponent("Tags", {
        names: field.array(field.string().max(50), 5),
      });
      const world = new World([Tags]);

      const entityId = world.createEntity();
      world.addComponent(entityId, Tags, {
        names: ["hello", "", "world"],
      });

      const result = Tags.read(entityId);
      expect(result.names).toEqual(["hello", "", "world"]);
    });

    it("should handle mixed element type arrays in same component", () => {
      const MixedComponent = defineComponent("MixedComponent", {
        numbers: field.array(field.float32(), 10),
        strings: field.array(field.string().max(20), 5),
        flags: field.array(field.boolean(), 8),
      });
      const world = new World([MixedComponent]);

      const entityId = world.createEntity();
      world.addComponent(entityId, MixedComponent, {
        numbers: [1.5, 2.5, 3.5],
        strings: ["a", "b", "c"],
        flags: [true, false, true],
      });

      const result = MixedComponent.read(entityId);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, Defaults, {});

      const result = Defaults.read(entityId);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, Combo, {});

      const result = Combo.read(entityId);
      expect(result.nums).toEqual([1.0, 2.0]);
      expect(result.strs).toEqual(["used"]);
    });
  });
});
