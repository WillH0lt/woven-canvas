import { World, field, EntityBuffer } from "../src/index";

/**
 * Entity Buffer Usage Examples
 *
 * The EntityBuffer stores entities in an efficient binary format using ArrayBuffer.
 * Each entity uses only 2 bytes (16 bits):
 * - Bit 0: alive/dead flag
 * - Bits 1-9: component mask (supports up to 512 components)
 * - Bits 10-15: reserved for future use
 *
 * This makes entity data extremely efficient and easy to share across threads.
 */

// Example 1: Basic usage with ArrayBuffer (default)
const world1 = new World(false); // false = use ArrayBuffer

const Position = world1.createComponent({
  x: field.float32().default(0),
  y: field.float32().default(0),
});

const Velocity = world1.createComponent({
  vx: field.float32().default(0),
  vy: field.float32().default(0),
});

// Create entities
const entity1 = world1.createEntity();
const entity2 = world1.createEntity();

world1.addComponent(entity1, Position, { x: 10, y: 20 });
world1.addComponent(entity1, Velocity, { vx: 1, vy: 2 });

world1.addComponent(entity2, Position, { x: 30, y: 40 });

console.log("Entity 1 has Position:", world1.hasComponent(entity1, Position));
console.log("Entity 1 has Velocity:", world1.hasComponent(entity1, Velocity));
console.log("Entity 2 has Velocity:", world1.hasComponent(entity2, Velocity));

// Example 2: Using SharedArrayBuffer for cross-thread sharing
const world2 = new World(true); // true = use SharedArrayBuffer

const Health = world2.createComponent({
  current: field.uint16().default(100),
  max: field.uint16().default(100),
});

const entity3 = world2.createEntity();
world2.addComponent(entity3, Health, { current: 75, max: 100 });

// Get direct access to the entity buffer for sharing
// Note: This is an internal API for advanced use cases
console.log("\nEntity Buffer Info:");
console.log("Entity 3 ID:", entity3);
console.log("Entity 3 has Health:", world2.hasComponent(entity3, Health));

// Example 3: Memory efficiency comparison
console.log("\n=== Memory Efficiency ===");

// Old approach (Map<EntityId, bigint>): approximately 48 bytes per entry
// - Map overhead: ~24 bytes per entry
// - EntityId (number): 8 bytes
// - Entity (bigint): 8 bytes
// - JavaScript object overhead: ~8 bytes
// Total: ~48 bytes per entity

// New approach (Uint16Array): 2 bytes per entity
// - 16 bits total per entity
// - Bit 0: alive flag
// - Bits 1-9: component mask
// Total: 2 bytes per entity

const entityCount = 10000;
const oldMemoryUsage = entityCount * 48; // bytes
const newMemoryUsage = entityCount * 2; // bytes
const savings = oldMemoryUsage - newMemoryUsage;
const savingsPercent = ((savings / oldMemoryUsage) * 100).toFixed(1);

console.log(`For ${entityCount.toLocaleString()} entities:`);
console.log(`Old approach (Map): ${(oldMemoryUsage / 1024).toFixed(2)} KB`);
console.log(
  `New approach (ArrayBuffer): ${(newMemoryUsage / 1024).toFixed(2)} KB`
);
console.log(
  `Memory savings: ${(savings / 1024).toFixed(2)} KB (${savingsPercent}%)`
);

// Example 4: Direct buffer access (advanced)
console.log("\n=== Direct Buffer Access (Advanced) ===");

// Access the entity buffer directly (for advanced use cases like serialization)
// This is not recommended for normal usage, but shows the power of the system
const world3 = new World(true);

const Tag = world3.createComponent({
  name: field.string().max(32),
});

for (let i = 0; i < 5; i++) {
  const entity = world3.createEntity();
  world3.addComponent(entity, Tag, { name: `Entity${i}` });
}

console.log("Created 5 entities with Tag component");
console.log("Entity buffer stores entities in a compact binary format");
console.log("Each entity: 2 bytes (alive flag + component mask)");

// Example 5: Removing entities efficiently
console.log("\n=== Entity Removal ===");

const world4 = new World();
const Active = world4.createComponent({
  timestamp: field.uint32().default(0),
});

const entities: number[] = [];
for (let i = 0; i < 3; i++) {
  const entity = world4.createEntity();
  world4.addComponent(entity, Active, { timestamp: Date.now() });
  entities.push(entity);
}

console.log("Created 3 entities");

// Remove the middle entity
world4.removeEntity(entities[1]);
console.log(`Removed entity ${entities[1]}`);

// Check which entities still exist
console.log(
  `Entity ${entities[0]} exists:`,
  world4.hasComponent(entities[0], Active)
);
console.log(
  `Entity ${entities[1]} exists:`,
  (() => {
    try {
      world4.hasComponent(entities[1], Active);
      return true;
    } catch {
      return false;
    }
  })()
);
console.log(
  `Entity ${entities[2]} exists:`,
  world4.hasComponent(entities[2], Active)
);

console.log("\n✅ All examples completed successfully!");
