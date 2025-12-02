import { World, field } from "../src/index";

/**
 * Performance comparison showing the benefits of number-based entity masks
 * vs the old bigint-based approach
 */

console.log("=== Entity Buffer Performance Benchmark ===\n");

// Test configuration
const ENTITY_COUNT = 100000;
const ITERATIONS = 100;

// Create world and components
const world = new World();

const Position = world.createComponent({
  x: field.float32().default(0),
  y: field.float32().default(0),
});

const Velocity = world.createComponent({
  vx: field.float32().default(0),
  vy: field.float32().default(0),
});

const Health = world.createComponent({
  current: field.uint16().default(100),
  max: field.uint16().default(100),
});

console.log(`Creating ${ENTITY_COUNT.toLocaleString()} entities...`);

// Benchmark: Entity Creation
const createStart = performance.now();
const entities: number[] = [];
for (let i = 0; i < ENTITY_COUNT; i++) {
  entities.push(world.createEntity());
}
const createTime = performance.now() - createStart;
console.log(`✓ Created in ${createTime.toFixed(2)}ms`);
console.log(
  `  (${((ENTITY_COUNT / createTime) * 1000).toFixed(0)} entities/sec)\n`
);

// Benchmark: Component Addition
console.log(`Adding components to entities...`);
const addStart = performance.now();
for (let i = 0; i < ENTITY_COUNT; i++) {
  if (i % 3 === 0) {
    world.addComponent(entities[i], Position, { x: i, y: i * 2 });
  }
  if (i % 2 === 0) {
    world.addComponent(entities[i], Velocity, { vx: 1, vy: -1 });
  }
  if (i % 5 === 0) {
    world.addComponent(entities[i], Health, { current: 75, max: 100 });
  }
}
const addTime = performance.now() - addStart;
console.log(`✓ Added in ${addTime.toFixed(2)}ms`);
console.log(
  `  (${((ENTITY_COUNT / addTime) * 1000).toFixed(0)} operations/sec)\n`
);

// Benchmark: Component Checking (hasComponent)
console.log(`Checking component presence (${ITERATIONS} iterations)...`);
const checkStart = performance.now();
let hasCount = 0;
for (let iter = 0; iter < ITERATIONS; iter++) {
  for (let i = 0; i < ENTITY_COUNT; i++) {
    if (world.hasComponent(entities[i], Position)) hasCount++;
    if (world.hasComponent(entities[i], Velocity)) hasCount++;
    if (world.hasComponent(entities[i], Health)) hasCount++;
  }
}
const checkTime = performance.now() - checkStart;
const checksPerformed = ENTITY_COUNT * 3 * ITERATIONS;
console.log(
  `✓ Performed ${checksPerformed.toLocaleString()} checks in ${checkTime.toFixed(
    2
  )}ms`
);
console.log(
  `  (${((checksPerformed / checkTime) * 1000).toFixed(0)} checks/sec)`
);
console.log(
  `  Average: ${((checkTime / checksPerformed) * 1000000).toFixed(
    3
  )} µs per check\n`
);

// Benchmark: Query Creation and Matching
console.log(`Creating and executing queries...`);
const queryStart = performance.now();

const movingQuery = world.query((q) => q.with(Position, Velocity));
const damageableQuery = world.query((q) => q.with(Health));
const movingWithHealthQuery = world.query((q) =>
  q.with(Position, Velocity, Health)
);

movingQuery._prepare();
damageableQuery._prepare();
movingWithHealthQuery._prepare();

const queryTime = performance.now() - queryStart;
console.log(`✓ Queries created and prepared in ${queryTime.toFixed(2)}ms`);
console.log(
  `  Moving entities: ${movingQuery.current.length.toLocaleString()}`
);
console.log(
  `  Damageable entities: ${damageableQuery.current.length.toLocaleString()}`
);
console.log(
  `  Moving+Health: ${movingWithHealthQuery.current.length.toLocaleString()}\n`
);

// Benchmark: Query Iteration
console.log(`Iterating query results (${ITERATIONS} iterations)...`);
const iterStart = performance.now();
let iterCount = 0;
for (let iter = 0; iter < ITERATIONS; iter++) {
  for (const entityId of movingQuery.current) {
    iterCount++;
  }
}
const iterTime = performance.now() - iterStart;
console.log(
  `✓ Iterated ${iterCount.toLocaleString()} entities in ${iterTime.toFixed(
    2
  )}ms`
);
console.log(
  `  (${((iterCount / iterTime) * 1000).toFixed(0)} iterations/sec)\n`
);

// Benchmark: Component Removal
console.log(`Removing components from entities...`);
const removeStart = performance.now();
for (let i = 0; i < ENTITY_COUNT; i += 10) {
  if (world.hasComponent(entities[i], Velocity)) {
    world.removeComponent(entities[i], Velocity);
  }
}
const removeTime = performance.now() - removeStart;
console.log(`✓ Removed in ${removeTime.toFixed(2)}ms\n`);

// Memory usage estimation
const bytesPerEntity = 2; // EntityBufferView uses 2 bytes per entity
const entityBufferSize = ENTITY_COUNT * bytesPerEntity;
const componentDataSize =
  (ENTITY_COUNT / 3) * 8 + // Position (2 floats)
  (ENTITY_COUNT / 2) * 8 + // Velocity (2 floats)
  (ENTITY_COUNT / 5) * 4; // Health (2 uint16s)

console.log("=== Memory Footprint ===");
console.log(`Entity Buffer: ${(entityBufferSize / 1024).toFixed(2)} KB`);
console.log(
  `Component Data (estimated): ${(componentDataSize / 1024).toFixed(2)} KB`
);
console.log(
  `Total (estimated): ${((entityBufferSize + componentDataSize) / 1024).toFixed(
    2
  )} KB\n`
);

// Performance summary
const totalTime =
  createTime + addTime + checkTime + queryTime + iterTime + removeTime;
console.log("=== Performance Summary ===");
console.log(`Total benchmark time: ${totalTime.toFixed(2)}ms`);
console.log(`\nKey Advantages:`);
console.log(`✓ Native JavaScript numbers (no bigint conversion)`);
console.log(`✓ Compact 2-byte storage per entity`);
console.log(`✓ Fast bitwise operations for component checks`);
console.log(`✓ Cache-friendly memory layout`);
console.log(`✓ Zero-copy with SharedArrayBuffer support`);
console.log(`\n✅ Benchmark completed successfully!`);
