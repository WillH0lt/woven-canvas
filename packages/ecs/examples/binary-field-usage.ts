import { World, field, Component } from "../src/index";

/**
 * Binary Field Usage Examples
 *
 * The binary field type allows storing raw binary data (Uint8Array) in components.
 * This is useful for:
 * - Cryptographic keys, signatures, and hashes
 * - Image/sprite pixel data
 * - Network protocol payloads
 * - Serialized game state
 * - Any raw byte data
 */

// Example 1: Component with cryptographic data
const cryptoSchema = {
  publicKey: field.binary().max(64), // 64 bytes for a public key
  signature: field.binary().max(128), // 128 bytes for a signature
  hash: field.binary().max(32).default(new Uint8Array(32)), // SHA-256 hash with default
};

// Example 2: Component with sprite/image data
const spriteSchema = {
  name: field.string().max(50),
  pixelData: field.binary().max(1024), // Small sprite data (e.g., 32x32 palette indexed)
  width: field.uint16(),
  height: field.uint16(),
};

// Example 3: Component with network packet data
const packetSchema = {
  packetId: field.uint32(),
  payload: field.binary().max(512), // Binary protocol payload
  timestamp: field.float64(),
};

console.log("=== Binary Field Type Example ===\n");

// Create world and components
const world = new World();
const CryptoData = new Component(cryptoSchema, 0);
const SpriteData = new Component(spriteSchema, 1);
const PacketData = new Component(packetSchema, 2);

// Example 1: Storing cryptographic data
console.log("1. Cryptographic Data:");
const entity1 = 1;

// Create a simulated public key
const publicKey = new Uint8Array(32);
for (let i = 0; i < 32; i++) {
  publicKey[i] = Math.floor(Math.random() * 256);
}

// Create a simulated signature
const signature = new Uint8Array(64);
signature.fill(0xff);

// Create a hash
const hash = new Uint8Array(32);
for (let i = 0; i < 32; i++) {
  hash[i] = i * 8;
}

// Store the binary data
CryptoData.from(entity1, { publicKey, signature, hash } as any);

// Read the data back
const crypto = CryptoData.read(entity1);
console.log("  Public key length:", crypto.publicKey.length);
console.log(
  "  Public key first 8 bytes:",
  Array.from(crypto.publicKey.slice(0, 8))
);
console.log("  Signature length:", crypto.signature.length);
console.log("  Hash first 8 bytes:", Array.from(crypto.hash.slice(0, 8)));

// Write to update the hash
const cryptoWrite = CryptoData.write(entity1);
const newHash = new Uint8Array(32).fill(0xab);
cryptoWrite.hash = newHash;

console.log(
  "  Updated hash first 4 bytes:",
  Array.from(CryptoData.read(entity1).hash.slice(0, 4))
);
console.log();

// Example 2: Storing sprite pixel data
console.log("2. Sprite Pixel Data:");
const entity2 = 2;

// Create an 8x8 sprite (64 pixels, 1 byte per pixel for color/palette index)
const pixels = new Uint8Array(64);
for (let y = 0; y < 8; y++) {
  for (let x = 0; x < 8; x++) {
    // Create a simple gradient pattern
    pixels[y * 8 + x] = (x + y) * 2;
  }
}

SpriteData.from(entity2, {
  name: "TestSprite",
  pixelData: pixels,
  width: 8,
  height: 8,
} as any);

const sprite = SpriteData.read(entity2);
console.log("  Sprite name:", sprite.name);
console.log("  Dimensions:", sprite.width, "x", sprite.height);
console.log("  Pixel data length:", sprite.pixelData.length);
console.log(
  "  First row (8 pixels):",
  Array.from(sprite.pixelData.slice(0, 8))
);
console.log(
  "  Second row (8 pixels):",
  Array.from(sprite.pixelData.slice(8, 16))
);
console.log();

// Example 3: Storing network packet data
console.log("3. Network Packet:");
const entity3 = 3;

// Simulate a binary protocol packet
// Format: [header(2)] [length(2)] [data(n)] [padding]
const payload = new Uint8Array([
  0x01,
  0x02, // Protocol header
  0x00,
  0x05, // Payload length = 5
  0x48,
  0x65,
  0x6c,
  0x6c,
  0x6f, // "Hello" in ASCII
]);

PacketData.from(entity3, {
  packetId: 42,
  payload: payload,
  timestamp: Date.now(),
} as any);

const packet = PacketData.read(entity3);
console.log("  Packet ID:", packet.packetId);
console.log("  Payload length:", packet.payload.length);
console.log("  Payload bytes:", Array.from(packet.payload));
console.log("  Timestamp:", new Date(packet.timestamp).toISOString());

// Decode the message
const decoder = new TextDecoder();
const message = decoder.decode(packet.payload.slice(4, 9));
console.log("  Decoded message:", message);
console.log();

// Example 4: Default values
console.log("4. Default Binary Values:");
const entity4 = 4;
CryptoData.from(entity4, {} as any); // Use defaults

const defaults = CryptoData.read(entity4);
console.log("  Default publicKey length:", defaults.publicKey.length);
console.log("  Default signature length:", defaults.signature.length);
console.log("  Default hash length:", defaults.hash.length);
console.log(
  "  Default hash is all zeros:",
  defaults.hash.every((b: number) => b === 0)
);
console.log(
  "  Custom default hash has values:",
  defaults.hash.some((b: number) => b !== 0)
);
console.log();

// Example 5: Binary data immutability
console.log("5. Binary Data Returns Copies:");
const read1 = CryptoData.read(entity1);
const hash1 = read1.hash;
const hash2 = read1.hash;

console.log(
  "  Multiple reads return different array instances:",
  hash1 !== hash2
);
console.log(
  "  But contain the same values:",
  hash1.every((v: number, i: number) => v === hash2[i])
);

// Modifying returned data doesn't affect stored data
hash1[0] = 99;
const hash3 = CryptoData.read(entity1).hash;
console.log(
  "  Modifying returned array doesn't affect storage:",
  hash3[0] !== 99
);
console.log();

console.log("=== Binary Field Usage Complete ===");
console.log("\nKey Features:");
console.log("- Store raw binary data efficiently");
console.log("- Set max length with .max() method");
console.log("- Provide default values with .default()");
console.log("- Returns copies to prevent accidental mutations");
console.log("- Uses length-prefixed storage (4 bytes + data)");
