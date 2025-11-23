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

      const entityId = world.createEntity();
      world.addComponent(entityId, User, {
        name: "Alice",
        email: "alice@example.com",
      });
      const user = User.read(entityId);

      // Direct property access
      expect(user.name).toBe("Alice");
      expect(user.email).toBe("alice@example.com");
    });

    it("should create a component with numeric fields", () => {
      const Position = world.createComponent({
        x: field.float32(),
        y: field.float32(),
        z: field.float32(),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Position, { x: 1.5, y: 2.5, z: 3.5 });
      const pos = Position.read(entityId);

      // Direct property access
      expect(pos.x).toBeCloseTo(1.5);
      expect(pos.y).toBeCloseTo(2.5);
      expect(pos.z).toBeCloseTo(3.5);
    });

    it("should create a component with mixed field types", () => {
      const Player = world.createComponent({
        name: field.string().max(30),
        health: field.uint8(),
        score: field.uint32(),
        speed: field.float32(),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Player, {
        name: "Bob",
        health: 100,
        score: 1500,
        speed: 5.5,
      });
      const player = Player.read(entityId);

      // Direct property access
      expect(player.name).toBe("Bob");
      expect(player.health).toBe(100);
      expect(player.score).toBe(1500);
      expect(player.speed).toBeCloseTo(5.5);
    });

    it("should support default values", () => {
      const Config = world.createComponent({
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
        label: field.string().max(20).default("default"),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, {});
      const config = Config.read(entityId);

      // Direct property access
      expect(config.enabled).toBe(true);
      expect(config.maxCount).toBe(100);
      expect(config.label).toBe("default");
    });

    it("should override default values when provided", () => {
      const Config = world.createComponent({
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, { enabled: false, maxCount: 50 });
      const config = Config.read(entityId);

      // Direct property access
      expect(config.enabled).toBe(false);
      expect(config.maxCount).toBe(50);
    });
  });

  describe("Component Instance Operations", () => {
    it("should allow setting values via direct property assignment", () => {
      const Counter = world.createComponent({
        count: field.uint32(),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Counter, { count: 0 });
      let counter = Counter.read(entityId);
      expect(counter.count).toBe(0);

      // Direct property assignment
      const writable = Counter.write(entityId);
      writable.count = 42;
      counter = Counter.read(entityId);
      expect(counter.count).toBe(42);
    });
  });

  describe("All Numeric Types", () => {
    it("should support uint8", () => {
      const C = world.createComponent({ val: field.uint8() });
      const entityId = world.createEntity();
      world.addComponent(entityId, C, { val: 255 });
      const c = C.read(entityId);
      expect(c.val).toBe(255);
    });

    it("should support uint16", () => {
      const C = world.createComponent({ val: field.uint16() });
      const entityId = world.createEntity();
      world.addComponent(entityId, C, { val: 65535 });
      const c = C.read(entityId);
      expect(c.val).toBe(65535);
    });

    it("should support uint32", () => {
      const C = world.createComponent({ val: field.uint32() });
      const entityId = world.createEntity();
      world.addComponent(entityId, C, { val: 4294967295 });
      const c = C.read(entityId);
      expect(c.val).toBe(4294967295);
    });

    it("should support int8", () => {
      const C = world.createComponent({ val: field.int8() });
      const entityId = world.createEntity();
      world.addComponent(entityId, C, { val: -128 });
      const c = C.read(entityId);
      expect(c.val).toBe(-128);
    });

    it("should support int16", () => {
      const C = world.createComponent({ val: field.int16() });
      const entityId = world.createEntity();
      world.addComponent(entityId, C, { val: -32768 });
      const c = C.read(entityId);
      expect(c.val).toBe(-32768);
    });

    it("should support int32", () => {
      const C = world.createComponent({ val: field.int32() });
      const entityId = world.createEntity();
      world.addComponent(entityId, C, { val: -2147483648 });
      const c = C.read(entityId);
      expect(c.val).toBe(-2147483648);
    });

    it("should support float32", () => {
      const C = world.createComponent({ val: field.float32() });
      const entityId = world.createEntity();
      world.addComponent(entityId, C, { val: 3.14159 });
      const c = C.read(entityId);
      expect(c.val).toBeCloseTo(3.14159, 5);
    });

    it("should support float64", () => {
      const C = world.createComponent({ val: field.float64() });
      const entityId = world.createEntity();
      world.addComponent(entityId, C, { val: 3.141592653589793 });
      const c = C.read(entityId);
      expect(c.val).toBeCloseTo(3.141592653589793, 15);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, TestComponent, {
        name: "test",
        count: 42,
        ratio: 0.5,
        enabled: true,
      });
      const instance = TestComponent.read(entityId);

      // These should all be properly typed
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
    it("should store and retrieve string values correctly", () => {
      const User = world.createComponent({
        name: field.string().max(50),
        email: field.string().max(100),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, User, {
        name: "Alice",
        email: "alice@example.com",
      });
      const user = User.read(entityId);

      expect(user.name).toBe("Alice");
      expect(user.email).toBe("alice@example.com");
    });

    it("should handle empty strings", () => {
      const Message = world.createComponent({
        content: field.string().max(200),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Message, { content: "" });
      const msg = Message.read(entityId);

      expect(msg.content).toBe("");
    });

    it("should handle default string values", () => {
      const Config = world.createComponent({
        label: field.string().max(20).default("default-label"),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, {});
      const config = Config.read(entityId);

      expect(config.label).toBe("default-label");
    });

    it("should allow updating string values", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, User, { name: "Alice" });

      const writable = User.write(entityId);
      writable.name = "Bob";

      const user = User.read(entityId);
      expect(user.name).toBe("Bob");
    });

    it("should handle strings with special characters", () => {
      const Data = world.createComponent({
        text: field.string().max(100),
      });

      const entityId = world.createEntity();
      const specialString = "Hello! 👋 @#$%^&*() 日本語";
      world.addComponent(entityId, Data, { text: specialString });
      const data = Data.read(entityId);

      expect(data.text).toBe(specialString);
    });

    it("should handle multiple entities with different string values", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

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

    it("should handle string updates without affecting other entities", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      world.addComponent(entity1, User, { name: "Alice" });
      world.addComponent(entity2, User, { name: "Bob" });

      User.write(entity1).name = "Alicia";

      expect(User.read(entity1).name).toBe("Alicia");
      expect(User.read(entity2).name).toBe("Bob");
    });

    it("should handle very long strings", () => {
      const Data = world.createComponent({
        text: field.string().max(1000),
      });

      const entityId = world.createEntity();
      const longString = "A".repeat(500);
      world.addComponent(entityId, Data, { text: longString });
      const data = Data.read(entityId);

      expect(data.text).toBe(longString);
      expect(data.text.length).toBe(500);
    });

    it("should handle strings in mixed components", () => {
      const Player = world.createComponent({
        name: field.string().max(30),
        health: field.uint8(),
        description: field.string().max(100),
        score: field.uint32(),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Player, {
        name: "Hero",
        health: 100,
        description: "A brave warrior",
        score: 1500,
      });
      const player = Player.read(entityId);

      expect(player.name).toBe("Hero");
      expect(player.health).toBe(100);
      expect(player.description).toBe("A brave warrior");
      expect(player.score).toBe(1500);
    });

    it("should handle string when no value provided and no default", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, User, {});
      const user = User.read(entityId);

      expect(user.name).toBe("");
    });

    it("should handle array growth with strings correctly", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

      // Create many entities to force array growth (initial capacity is 10000)
      const entities: number[] = [];
      for (let i = 0; i < 15000; i++) {
        const eid = world.createEntity();
        world.addComponent(eid, User, { name: `User${i}` });
        entities.push(eid);
      }

      // Verify a few entities across the range
      expect(User.read(entities[0]).name).toBe("User0");
      expect(User.read(entities[5000]).name).toBe("User5000");
      expect(User.read(entities[10000]).name).toBe("User10000");
      expect(User.read(entities[14999]).name).toBe("User14999");
    });

    it("should handle string updates after array growth", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

      // Create enough entities to force growth
      const entities: number[] = [];
      for (let i = 0; i < 15000; i++) {
        const eid = world.createEntity();
        world.addComponent(eid, User, { name: `User${i}` });
        entities.push(eid);
      }

      // Update a string after growth
      User.write(entities[12000]).name = "UpdatedUser";
      expect(User.read(entities[12000]).name).toBe("UpdatedUser");

      // Ensure other entities are unaffected
      expect(User.read(entities[11999]).name).toBe("User11999");
      expect(User.read(entities[12001]).name).toBe("User12001");
    });

    it("should preserve string values across multiple reads and writes", () => {
      const Data = world.createComponent({
        value: field.string().max(100),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Data, { value: "initial" });

      // Multiple reads
      expect(Data.read(entityId).value).toBe("initial");
      expect(Data.read(entityId).value).toBe("initial");

      // Write
      Data.write(entityId).value = "updated";

      // More reads
      expect(Data.read(entityId).value).toBe("updated");
      expect(Data.read(entityId).value).toBe("updated");

      // Another write
      Data.write(entityId).value = "final";
      expect(Data.read(entityId).value).toBe("final");
    });

    it("should handle null and undefined as empty strings", () => {
      const Data = world.createComponent({
        value: field.string().max(50),
      });

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      // TypeScript would normally prevent this, but at runtime it could happen
      world.addComponent(entity1, Data, { value: null as any });
      world.addComponent(entity2, Data, { value: undefined as any });

      // Should store as empty or convert to string
      const data1 = Data.read(entity1);
      const data2 = Data.read(entity2);

      // At minimum, it shouldn't crash and should return some value
      expect(typeof data1.value).toBe("string");
      expect(typeof data2.value).toBe("string");
    });

    it("should truncate strings that exceed maxLength", () => {
      const Data = world.createComponent({
        shortText: field.string().max(10),
      });

      const entityId = world.createEntity();
      const longString = "This is a very long string that exceeds 10 bytes";
      world.addComponent(entityId, Data, { shortText: longString });

      const data = Data.read(entityId);

      // String should be truncated to fit within maxLength (10 bytes of actual data)
      // So we expect 10 characters max
      expect(data.shortText.length).toBeLessThanOrEqual(10);
      expect(data.shortText).toBe(longString.substring(0, 10));
    });

    it("should handle UTF-8 multi-byte characters correctly", () => {
      const Data = world.createComponent({
        text: field.string().max(20),
      });

      const entityId = world.createEntity();
      // Emoji are multi-byte UTF-8 characters
      const emojiString = "Hello👋";
      world.addComponent(entityId, Data, { text: emojiString });

      const data = Data.read(entityId);
      expect(data.text).toBe(emojiString);
    });

    it("should use ArrayBuffer-backed storage for strings", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

      // Access the internal buffer to verify it's using ArrayBuffer storage
      const buffer = (User.buffer as any).name;

      // Should have a getBuffer method (StringBufferView)
      expect(typeof buffer.getBuffer).toBe("function");

      // Should return a Uint8Array
      const underlyingBuffer = buffer.getBuffer();
      expect(underlyingBuffer).toBeInstanceOf(Uint8Array);

      // Should have the expected length
      expect(buffer.length).toBe(10000); // INITIAL_CAPACITY
    });

    it("should encode string length in buffer for stateless operation", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

      const entityId = world.createEntity();
      const testString = "Hello World";
      world.addComponent(entityId, User, { name: testString });

      // Access the raw buffer
      const buffer = (User.buffer as any).name.getBuffer();

      // First 4 bytes at entity 0 should contain the length (11 bytes for "Hello World")
      const offset = entityId * 54; // bytesPerString = 50 data + 4 header = 54
      const b0 = buffer[offset];
      const b1 = buffer[offset + 1];
      const b2 = buffer[offset + 2];
      const b3 = buffer[offset + 3];
      const storedLength = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);

      expect(storedLength).toBe(11); // "Hello World" is 11 bytes in UTF-8

      // Read back the string to verify it matches
      const readBack = User.read(entityId).name;
      expect(readBack).toBe(testString);
    });

    it("should work with SharedArrayBuffer semantics (stateless)", () => {
      const User = world.createComponent({
        name: field.string().max(50),
      });

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      // Write strings
      User.write(entity1).name = "Alice";
      User.write(entity2).name = "Bob";

      // Get the underlying buffer
      const rawBuffer = (User.buffer as any).name.getBuffer();

      // Create a new StringBufferView from the same buffer (simulating cross-thread access)
      const newView = new (User.buffer as any).name.constructor(
        rawBuffer.buffer,
        10000,
        54 // 50 bytes data + 4 bytes length prefix
      );

      // Should be able to read the strings without any instance state
      expect(newView.get(entity1)).toBe("Alice");
      expect(newView.get(entity2)).toBe("Bob");
    });
  });
  describe("From Function Validation", () => {
    it("should use defaults for missing fields when defaults are defined", () => {
      const Config = world.createComponent({
        enabled: field.boolean().default(true),
        maxCount: field.uint16().default(100),
        label: field.string().max(20).default("default"),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, {});
      const config = Config.read(entityId);

      expect(config.enabled).toBe(true);
      expect(config.maxCount).toBe(100);
      expect(config.label).toBe("default");
    });

    it("should use type-based fallbacks for missing fields without defaults", () => {
      const Entity = world.createComponent({
        name: field.string().max(20),
        count: field.uint32(),
        active: field.boolean(),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Entity, {});
      const entity = Entity.read(entityId);

      expect(entity.name).toBe("");
      expect(entity.count).toBe(0);
      expect(entity.active).toBe(false);
    });

    it("should use defaults over type fallbacks when available", () => {
      const Mixed = world.createComponent({
        withDefault: field.uint32().default(42),
        withoutDefault: field.uint32(),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Mixed, {});
      const mixed = Mixed.read(entityId);

      expect(mixed.withDefault).toBe(42);
      expect(mixed.withoutDefault).toBe(0);
    });

    it("should use provided values over defaults", () => {
      const Config = world.createComponent({
        enabled: field.boolean().default(true),
        count: field.uint32().default(10),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Config, {
        enabled: false,
        count: 5,
      });
      const config = Config.read(entityId);

      expect(config.enabled).toBe(false);
      expect(config.count).toBe(5);
    });

    it("should handle partially missing fields correctly", () => {
      const Player = world.createComponent({
        name: field.string().max(20).default("Unknown"),
        health: field.uint8(),
        score: field.uint32().default(0),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, Player, { name: "Bob" });
      const player = Player.read(entityId);

      expect(player.name).toBe("Bob");
      expect(player.health).toBe(0);
      expect(player.score).toBe(0);
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

      const entityId = world.createEntity();
      world.addComponent(entityId, AllTypes, {});
      const instance = AllTypes.read(entityId);

      expect(instance.u8).toBe(0);
      expect(instance.u16).toBe(0);
      expect(instance.u32).toBe(0);
      expect(instance.i8).toBe(0);
      expect(instance.i16).toBe(0);
      expect(instance.i32).toBe(0);
      expect(instance.f32).toBe(0);
      expect(instance.f64).toBe(0);
    });
  });

  describe("Binary Field Handling", () => {
    it("should store and retrieve binary data correctly", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entityId = world.createEntity();
      const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      world.addComponent(entityId, BinaryData, { data: testData });
      const result = BinaryData.read(entityId);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(8);
      expect(Array.from(result.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("should handle empty binary data", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, { data: new Uint8Array(0) });
      const result = BinaryData.read(entityId);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(0);
    });

    it("should use default binary value when provided", () => {
      const defaultData = new Uint8Array([0xff, 0xfe, 0xfd]);
      const BinaryData = world.createComponent({
        data: field.binary().max(128).default(defaultData),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {});
      const result = BinaryData.read(entityId);

      expect(result.data.length).toBe(3);
      expect(Array.from(result.data)).toEqual([0xff, 0xfe, 0xfd]);
    });

    it("should default to empty Uint8Array when no default specified", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {});
      const result = BinaryData.read(entityId);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(0);
    });

    it("should allow updating binary data", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {
        data: new Uint8Array([1, 2, 3]),
      });

      const writable = BinaryData.write(entityId);
      writable.data = new Uint8Array([4, 5, 6, 7]);

      const result = BinaryData.read(entityId);
      expect(Array.from(result.data)).toEqual([4, 5, 6, 7]);
    });

    it("should handle binary data with cryptographic use case", () => {
      const CryptoData = world.createComponent({
        publicKey: field.binary().max(64),
        signature: field.binary().max(128),
        hash: field.binary().max(64), // Need to account for 4-byte length prefix
      });

      const entityId = world.createEntity();

      // Simulate cryptographic data
      const publicKey = new Uint8Array(32).fill(0xab);
      const signature = new Uint8Array(64).fill(0xff);
      const hash = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        hash[i] = i * 8;
      }

      world.addComponent(entityId, CryptoData, {
        publicKey,
        signature,
        hash,
      });

      const result = CryptoData.read(entityId);
      expect(result.publicKey.length).toBe(32);
      expect(result.signature.length).toBe(64);
      expect(result.hash.length).toBe(32);
      expect(result.publicKey.every((b: number) => b === 0xab)).toBe(true);
      expect(result.signature.every((b: number) => b === 0xff)).toBe(true);
      expect(result.hash[0]).toBe(0);
      expect(result.hash[1]).toBe(8);
      expect(result.hash[31]).toBe(248);
    });

    it("should handle binary data with sprite/image use case", () => {
      const SpriteData = world.createComponent({
        pixelData: field.binary().max(1024),
        width: field.uint16(),
        height: field.uint16(),
      });

      const entityId = world.createEntity();

      // Create an 8x8 sprite (64 pixels)
      const pixels = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        pixels[i] = i % 16;
      }

      world.addComponent(entityId, SpriteData, {
        pixelData: pixels,
        width: 8,
        height: 8,
      });

      const result = SpriteData.read(entityId);
      expect(result.pixelData.length).toBe(64);
      expect(result.width).toBe(8);
      expect(result.height).toBe(8);
      expect(result.pixelData[0]).toBe(0);
      expect(result.pixelData[15]).toBe(15);
      expect(result.pixelData[63]).toBe(15);
    });

    it("should return copies of binary data to prevent mutations", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entityId = world.createEntity();
      const originalData = new Uint8Array([1, 2, 3, 4, 5]);
      world.addComponent(entityId, BinaryData, { data: originalData });

      const read1 = BinaryData.read(entityId);
      const read2 = BinaryData.read(entityId);

      // Should return different array instances
      expect(read1.data).not.toBe(read2.data);

      // But with the same values
      expect(Array.from(read1.data)).toEqual(Array.from(read2.data));

      // Modifying returned data shouldn't affect stored data
      read1.data[0] = 99;
      const read3 = BinaryData.read(entityId);
      expect(read3.data[0]).toBe(1); // Still original value
    });

    it("should handle multiple entities with different binary data", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      world.addComponent(entity1, BinaryData, {
        data: new Uint8Array([1, 2, 3]),
      });
      world.addComponent(entity2, BinaryData, {
        data: new Uint8Array([4, 5, 6, 7, 8]),
      });
      world.addComponent(entity3, BinaryData, {
        data: new Uint8Array([9]),
      });

      expect(Array.from(BinaryData.read(entity1).data)).toEqual([1, 2, 3]);
      expect(Array.from(BinaryData.read(entity2).data)).toEqual([
        4, 5, 6, 7, 8,
      ]);
      expect(Array.from(BinaryData.read(entity3).data)).toEqual([9]);
    });

    it("should handle binary updates without affecting other entities", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      world.addComponent(entity1, BinaryData, {
        data: new Uint8Array([1, 2, 3]),
      });
      world.addComponent(entity2, BinaryData, {
        data: new Uint8Array([4, 5, 6]),
      });

      BinaryData.write(entity1).data = new Uint8Array([10, 20, 30]);

      expect(Array.from(BinaryData.read(entity1).data)).toEqual([10, 20, 30]);
      expect(Array.from(BinaryData.read(entity2).data)).toEqual([4, 5, 6]);
    });

    it("should handle large binary data", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(2048),
      });

      const entityId = world.createEntity();
      const largeData = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) {
        largeData[i] = i % 256;
      }

      world.addComponent(entityId, BinaryData, { data: largeData });
      const result = BinaryData.read(entityId);

      expect(result.data.length).toBe(1024);
      expect(result.data[0]).toBe(0);
      expect(result.data[255]).toBe(255);
      expect(result.data[256]).toBe(0);
      expect(result.data[1023]).toBe(255);
    });

    it("should truncate binary data that exceeds maxLength", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(20), // 20 bytes of actual data capacity
      });

      const entityId = world.createEntity();
      const largeData = new Uint8Array(100).fill(42);
      world.addComponent(entityId, BinaryData, { data: largeData });

      const result = BinaryData.read(entityId);
      // Should be truncated to fit (20 bytes of data)
      expect(result.data.length).toBeLessThanOrEqual(20);
      expect(result.data.every((b: number) => b === 42)).toBe(true);
    });

    it("should handle binary data in mixed components", () => {
      const NetworkPacket = world.createComponent({
        packetId: field.uint32(),
        payload: field.binary().max(512),
        timestamp: field.float64(),
        sender: field.string().max(50),
      });

      const entityId = world.createEntity();
      const payload = new Uint8Array([
        0x01, 0x02, 0x48, 0x65, 0x6c, 0x6c, 0x6f,
      ]); // "Hello"

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

    it("should handle array growth with binary data correctly", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(64),
      });

      // Create many entities to force array growth
      const entities: number[] = [];
      for (let i = 0; i < 15000; i++) {
        const eid = world.createEntity();
        const data = new Uint8Array([i % 256, (i >> 8) % 256]);
        world.addComponent(eid, BinaryData, { data });
        entities.push(eid);
      }

      // Verify a few entities across the range
      const result0 = BinaryData.read(entities[0]);
      expect(Array.from(result0.data)).toEqual([0, 0]);

      const result5000 = BinaryData.read(entities[5000]);
      expect(Array.from(result5000.data)).toEqual([136, 19]); // 5000 % 256 = 136, 5000 >> 8 = 19

      const result10000 = BinaryData.read(entities[10000]);
      expect(Array.from(result10000.data)).toEqual([16, 39]); // 10000 % 256 = 16, 10000 >> 8 = 39

      const result14999 = BinaryData.read(entities[14999]);
      expect(Array.from(result14999.data)).toEqual([151, 58]); // 14999 % 256 = 151, 14999 >> 8 = 58
    });

    it("should handle binary updates after array growth", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(64),
      });

      // Create enough entities to force growth
      const entities: number[] = [];
      for (let i = 0; i < 15000; i++) {
        const eid = world.createEntity();
        world.addComponent(eid, BinaryData, {
          data: new Uint8Array([i % 256]),
        });
        entities.push(eid);
      }

      // Update binary data after growth
      BinaryData.write(entities[12000]).data = new Uint8Array([99, 88, 77]);
      const result = BinaryData.read(entities[12000]);
      expect(Array.from(result.data)).toEqual([99, 88, 77]);

      // Ensure other entities are unaffected
      expect(BinaryData.read(entities[11999]).data[0]).toBe(11999 % 256);
      expect(BinaryData.read(entities[12001]).data[0]).toBe(12001 % 256);
    });

    it("should preserve binary values across multiple reads and writes", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {
        data: new Uint8Array([1, 2, 3]),
      });

      // Multiple reads
      expect(Array.from(BinaryData.read(entityId).data)).toEqual([1, 2, 3]);
      expect(Array.from(BinaryData.read(entityId).data)).toEqual([1, 2, 3]);

      // Write
      BinaryData.write(entityId).data = new Uint8Array([4, 5]);

      // More reads
      expect(Array.from(BinaryData.read(entityId).data)).toEqual([4, 5]);
      expect(Array.from(BinaryData.read(entityId).data)).toEqual([4, 5]);

      // Another write
      BinaryData.write(entityId).data = new Uint8Array([6, 7, 8, 9]);
      expect(Array.from(BinaryData.read(entityId).data)).toEqual([6, 7, 8, 9]);
    });

    it("should handle all byte values (0-255)", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(512),
      });

      const entityId = world.createEntity();
      const allBytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        allBytes[i] = i;
      }

      world.addComponent(entityId, BinaryData, { data: allBytes });
      const result = BinaryData.read(entityId);

      expect(result.data.length).toBe(256);
      for (let i = 0; i < 256; i++) {
        expect(result.data[i]).toBe(i);
      }
    });

    it("should use ArrayBuffer-backed storage for binary data", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      // Access the internal buffer to verify it's using ArrayBuffer storage
      const buffer = (BinaryData.buffer as any).data;

      // Should have a getBuffer method (BinaryBufferView)
      expect(typeof buffer.getBuffer).toBe("function");

      // Should return a Uint8Array
      const underlyingBuffer = buffer.getBuffer();
      expect(underlyingBuffer).toBeInstanceOf(Uint8Array);

      // Should have the expected length
      expect(buffer.length).toBe(10000); // INITIAL_CAPACITY
    });

    it("should encode binary data length in buffer", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entityId = world.createEntity();
      const testData = new Uint8Array([10, 20, 30, 40, 50]);
      world.addComponent(entityId, BinaryData, { data: testData });

      // Access the raw buffer
      const buffer = (BinaryData.buffer as any).data.getBuffer();

      // First 4 bytes at entity offset should contain the length (5 bytes)
      const offset = entityId * 132; // bytesPerEntry = 128 data + 4 header = 132
      const b0 = buffer[offset];
      const b1 = buffer[offset + 1];
      const b2 = buffer[offset + 2];
      const b3 = buffer[offset + 3];
      const storedLength = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);

      expect(storedLength).toBe(5);

      // Verify the data after the length prefix
      expect(buffer[offset + 4]).toBe(10);
      expect(buffer[offset + 5]).toBe(20);
      expect(buffer[offset + 6]).toBe(30);
      expect(buffer[offset + 7]).toBe(40);
      expect(buffer[offset + 8]).toBe(50);
    });

    it("should work with SharedArrayBuffer semantics (stateless)", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      // Write binary data
      BinaryData.write(entity1).data = new Uint8Array([1, 2, 3]);
      BinaryData.write(entity2).data = new Uint8Array([4, 5, 6, 7]);

      // Get the underlying buffer
      const rawBuffer = (BinaryData.buffer as any).data.getBuffer();

      // Create a new BinaryBufferView from the same buffer (simulating cross-thread access)
      const newView = new (BinaryData.buffer as any).data.constructor(
        rawBuffer.buffer,
        10000,
        132 // 128 bytes data + 4 bytes length prefix
      );

      // Should be able to read the binary data without any instance state
      const result1 = newView.get(entity1);
      const result2 = newView.get(entity2);

      expect(Array.from(result1)).toEqual([1, 2, 3]);
      expect(Array.from(result2)).toEqual([4, 5, 6, 7]);
    });

    it("should handle TypeScript type inference for binary fields", () => {
      const TestComponent = world.createComponent({
        name: field.string().max(20),
        data: field.binary().max(128),
        count: field.uint32(),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, TestComponent, {
        name: "test",
        data: new Uint8Array([1, 2, 3]),
        count: 42,
      });
      const instance = TestComponent.read(entityId);

      // These should all be properly typed
      const name: string = instance.name;
      const data: Uint8Array = instance.data;
      const count: number = instance.count;

      expect(name).toBe("test");
      expect(data).toBeInstanceOf(Uint8Array);
      expect(Array.from(data)).toEqual([1, 2, 3]);
      expect(count).toBe(42);
    });

    it("should handle clearing binary data by setting empty array", () => {
      const BinaryData = world.createComponent({
        data: field.binary().max(128),
      });

      const entityId = world.createEntity();
      world.addComponent(entityId, BinaryData, {
        data: new Uint8Array([1, 2, 3, 4, 5]),
      });

      // Clear by setting empty array
      BinaryData.write(entityId).data = new Uint8Array(0);

      const result = BinaryData.read(entityId);
      expect(result.data.length).toBe(0);
    });
  });
});
