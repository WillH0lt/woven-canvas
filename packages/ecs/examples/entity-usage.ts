import { field, component, World } from "../src/index";

// Define components for a simple game
const Position = component({
  x: field.float32().default(0),
  y: field.float32().default(0),
});

const Velocity = component({
  dx: field.float32().default(0),
  dy: field.float32().default(0),
});

const Health = component({
  current: field.uint16().default(100),
  max: field.uint16().default(100),
  regeneration: field.float32().default(0),
});

const Name = component({
  value: field.string().max(50).default("Entity"),
});

const Sprite = component({
  texture: field.string().max(100),
  layer: field.uint8().default(0),
  visible: field.boolean().default(true),
});

console.log("=== Entity Component System Demo ===\n");

// Create world
const doc = new World({
  systems: [],
});

// Create player entity
console.log("Creating player entity...");
const player = doc.createEntity();
player.add(Name, { value: "Hero" });
player.add(Position, { x: 100, y: 100 });
player.add(Velocity, { dx: 0, dy: 0 });
player.add(Health, { current: 100, max: 100, regeneration: 1.5 });
player.add(Sprite, { texture: "hero.png", layer: 1 });

console.log(`Player ID: ${player.getId()}`);
console.log(`Player has Name: ${player.has(Name)}`);
console.log(`Player has Position: ${player.has(Position)}`);
console.log();

// Create enemy entities
console.log("Creating enemy entities...");
const enemy1 = doc.createEntity();
enemy1.add(Name, { value: "Goblin" });
enemy1.add(Position, { x: 200, y: 150 });
enemy1.add(Velocity, { dx: -1, dy: 0 });
enemy1.add(Health, { current: 50, max: 50 });
enemy1.add(Sprite, { texture: "goblin.png", layer: 1 });

const enemy2 = doc.createEntity();
enemy2.add(Name, { value: "Orc" });
enemy2.add(Position, { x: 300, y: 120 });
enemy2.add(Velocity, { dx: -0.5, dy: 0.5 });
enemy2.add(Health, { current: 80, max: 80 });
enemy2.add(Sprite, { texture: "orc.png", layer: 1 });

console.log(`Created ${doc.getEntityCount()} entities (1 player, 2 enemies)\n`);

console.log("=== Simulating Game Loop ===\n");

// Frame 1: Movement system
console.log("--- Frame 1: Movement System ---");
const movableQuery = doc.query((q) => q.with(Position, Velocity));
console.log(`Found ${movableQuery.count} movable entities`);
const movableEntities = [...movableQuery.current];

for (const entity of movableEntities) {
  const pos = entity.get(Position)!;
  const vel = entity.get(Velocity)!;
  const name = entity.get(Name)!;

  // Update position
  pos.value.x += vel.value.dx;
  pos.value.y += vel.value.dy;

  console.log(
    `  ${name.value.value} moved to (${pos.value.x.toFixed(
      1
    )}, ${pos.value.y.toFixed(1)})`
  );
}
console.log();

// Frame 2: Player input - change velocity
console.log("--- Frame 2: Player Input ---");
const playerVel = player.get(Velocity)!;
playerVel.value.dx = 2;
playerVel.value.dy = 1;
console.log(
  `Player velocity changed to (${playerVel.value.dx}, ${playerVel.value.dy})`
);

// Apply movement
for (const entity of movableEntities) {
  const pos = entity.get(Position)!;
  const vel = entity.get(Velocity)!;
  const name = entity.get(Name)!;

  pos.value.x += vel.value.dx;
  pos.value.y += vel.value.dy;

  console.log(
    `  ${name.value.value} moved to (${pos.value.x.toFixed(
      1
    )}, ${pos.value.y.toFixed(1)})`
  );
}
console.log();

// Frame 3: Combat - player takes damage
console.log("--- Frame 3: Combat System ---");
const playerHealth = player.get(Health)!;
const damage = 25;
playerHealth.value.current -= damage;

console.log(`Player took ${damage} damage!`);
console.log(
  `  Health: ${playerHealth.value.current}/${playerHealth.value.max}`
);

// Check all entities with health
const healthQuery = doc.query((q) => q.with(Health));
console.log(`\nHealth status of all ${healthQuery.count} entities:`);
const entitiesWithHealth = [...healthQuery.current];
for (const entity of entitiesWithHealth) {
  const name = entity.get(Name)!;
  const health = entity.get(Health)!;
  console.log(
    `  ${name.value.value}: ${health.value.current}/${health.value.max}`
  );
}

console.log();

// Frame 4: Regeneration system
console.log("--- Frame 4: Regeneration System ---");
for (const entity of entitiesWithHealth) {
  const health = entity.get(Health)!;
  const name = entity.get(Name)!;

  if (
    health.value.regeneration > 0 &&
    health.value.current < health.value.max
  ) {
    const oldHealth = health.value.current;
    health.value.current = Math.min(
      health.value.current + health.value.regeneration,
      health.value.max
    );

    const healed = health.value.current - oldHealth;
    console.log(`  ${name.value.value} regenerated ${healed.toFixed(1)} HP`);
  }
}
console.log();

// Frame 5: Visibility toggle
console.log("--- Frame 5: Visibility System ---");
const enemy1Sprite = enemy1.get(Sprite)!;
enemy1Sprite.value.visible = false;

const spriteQuery = doc.query((q) => q.with(Sprite));
const entitiesWithSprites = [...spriteQuery.current];
console.log("Sprite visibility:");
for (const entity of entitiesWithSprites) {
  const name = entity.get(Name)!;
  const sprite = entity.get(Sprite)!;
  console.log(
    `  ${name.value.value}: ${sprite.value.visible ? "visible" : "hidden"}`
  );
}
console.log();

// Final state
console.log("=== Final Entity State ===\n");
const allEntitiesQuery = doc.query((q) => q.with(Name));
for (const entity of allEntitiesQuery.current) {
  const name = entity.get(Name)!;
  console.log(`${name.value.value} (ID: ${entity.getId()}):`);

  // Print component data
  if (entity.has(Position)) {
    console.log(`  Position:`, entity.get(Position)!.toJSON());
  }
  if (entity.has(Velocity)) {
    console.log(`  Velocity:`, entity.get(Velocity)!.toJSON());
  }
  if (entity.has(Health)) {
    console.log(`  Health:`, entity.get(Health)!.toJSON());
  }
  if (entity.has(Sprite)) {
    console.log(`  Sprite:`, entity.get(Sprite)!.toJSON());
  }
  console.log();
}

console.log(`Total entities: ${doc.getEntityCount()}`);
const posVelQuery = doc.query((q) => q.with(Position, Velocity));
console.log(`Entities with Position+Velocity: ${posVelQuery.count}`);
const finalHealthQuery = doc.query((q) => q.with(Health));
console.log(`Entities with Health: ${finalHealthQuery.count}`);
