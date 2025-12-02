import { describe, it, expect } from "vitest";
import { field, defineComponent, World } from "../src";

describe("Component", () => {
  describe("Component Lifecycle", () => {
    it("should prevent double initialization", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });

      const world1 = new World({ Position });

      expect(() => {
        const world2 = new World({ Position });
      }).toThrow(/already been initialized/);
    });

    it("should assign unique bitmasks to components", () => {
      const Position = defineComponent("Position", {
        x: field.float32(),
        y: field.float32(),
      });
      const Velocity = defineComponent("Velocity", {
        x: field.float32(),
        y: field.float32(),
      });
      const world = new World({ Position, Velocity });

      expect(Position.bitmask).toBe(1); // 1 << 0
      expect(Velocity.bitmask).toBe(2); // 1 << 1
    });
  });

  describe("Component Definition", () => {
    it("should create a component with string fields", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
        email: field.string().max(100),
      });
      const world = new World({ User });

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
      const world = new World({ Position });

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
      const world = new World({ Player });

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
      const world = new World({ Config });

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
      const world = new World({ Config });

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
      const world = new World({ Counter });

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
      const world = new World({ Counter });

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
      const world = new World({ AllTypes });

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
      const world = new World({ AllTypes });

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
      const world = new World({ Flags });

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
      const world = new World({ Flags });

      const entityId = world.createEntity();
      world.addComponent(entityId, Flags, {});
      const flags = Flags.read(entityId);

      expect(flags.flag).toBe(false);
    });

    it("should allow updating boolean values", () => {
      const Flags = defineComponent("Flags", {
        isActive: field.boolean(),
      });
      const world = new World({ Flags });

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
      const world = new World({ TestComponent });

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
      const world = new World({ User });

      const entityId = world.createEntity();
      world.addComponent(entityId, User, {});
      const user = User.read(entityId);

      expect(user.name).toBe("");
    });

    it("should handle special characters and unicode", () => {
      const Data = defineComponent("Data", {
        text: field.string().max(100),
      });
      const world = new World({ Data });

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
      const world = new World({ User });

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
      const world = new World({ Data });

      const entityId = world.createEntity();
      const longString = "This is a very long string";
      world.addComponent(entityId, Data, { shortText: longString });

      const data = Data.read(entityId);
      expect(data.shortText.length).toBeLessThanOrEqual(10);
      expect(data.shortText).toBe(longString.substring(0, 10));
    });

    it("should handle array growth with strings", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
      });
      const world = new World({ User });

      const entities: number[] = [];
      for (let i = 0; i < 15000; i++) {
        const eid = world.createEntity();
        world.addComponent(eid, User, { name: `User${i}` });
        entities.push(eid);
      }

      expect(User.read(entities[0]).name).toBe("User0");
      expect(User.read(entities[5000]).name).toBe("User5000");
      expect(User.read(entities[10000]).name).toBe("User10000");
      expect(User.read(entities[14999]).name).toBe("User14999");
    });

    it("should encode string length in buffer for stateless operation", () => {
      const User = defineComponent("User", {
        name: field.string().max(50),
      });
      const world = new World({ User });

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
      const world = new World({ Config });

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
      const world = new World({ Entity });

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
      const world = new World({ Config });

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
      const world = new World({ BinaryData });

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
      const world = new World({ BinaryData });

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
      const world = new World({ BinaryData });

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {});
      const result = BinaryData.read(entityId);

      expect(Array.from(result.data)).toEqual([0xff, 0xfe, 0xfd]);
    });

    it("should allow updating binary data", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World({ BinaryData });

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
      const world = new World({ BinaryData });

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
      const world = new World({ BinaryData });

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
      const world = new World({ BinaryData });

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
      const world = new World({ NetworkPacket });

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

    it("should handle array growth with binary data", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(64),
      });
      const world = new World({ BinaryData });

      const entities: number[] = [];
      for (let i = 0; i < 15000; i++) {
        const eid = world.createEntity();
        const data = new Uint8Array([i % 256, (i >> 8) % 256]);
        world.addComponent(eid, BinaryData, { data });
        entities.push(eid);
      }

      const result0 = BinaryData.read(entities[0]);
      expect(Array.from(result0.data)).toEqual([0, 0]);

      const result5000 = BinaryData.read(entities[5000]);
      expect(Array.from(result5000.data)).toEqual([136, 19]);

      const result14999 = BinaryData.read(entities[14999]);
      expect(Array.from(result14999.data)).toEqual([151, 58]);
    });

    it("should encode binary length in buffer for stateless operation", () => {
      const BinaryData = defineComponent("BinaryData", {
        data: field.binary().max(128),
      });
      const world = new World({ BinaryData });

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
});
