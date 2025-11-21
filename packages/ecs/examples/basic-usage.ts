import { field, component } from "../src/index";

// Define a Player component with various field types
const Player = component({
  // String fields
  name: field.string().max(30).default("Player"),

  // Numeric fields
  health: field.uint16().default(100),
  maxHealth: field.uint16().default(100),
  mana: field.uint16().default(50),
  level: field.uint8().default(1),
  experience: field.uint32().default(0),

  // Float fields for position/movement
  x: field.float32().default(0),
  y: field.float32().default(0),
  speed: field.float32().default(5.0),

  // Boolean flags
  alive: field.boolean().default(true),
  canMove: field.boolean().default(true),
});

// Create a player instance
const player = Player.from({
  name: "Hero",
  x: 100,
  y: 50,
});

console.log("=== Initial Player State ===");
console.log("Name:", player.value.name);
console.log("Position:", player.value.x, player.value.y);
console.log("Health:", player.value.health, "/", player.value.maxHealth);
console.log("Level:", player.value.level);
console.log("Alive:", player.value.alive);

// Direct property access for updates
console.log("\n=== Moving Player ===");
player.value.x += 10;
player.value.y += 5;
console.log("New position:", player.value.x, player.value.y);

// Take damage
console.log("\n=== Taking Damage ===");
const damage = 30;
player.value.health -= damage;
console.log(
  `Took ${damage} damage. Health: ${player.value.health}/${player.value.maxHealth}`
);

// Heal
console.log("\n=== Healing ===");
const healAmount = 20;
player.value.health = Math.min(player.value.health + healAmount, player.value.maxHealth);
console.log(
  `Healed ${healAmount}. Health: ${player.value.health}/${player.value.maxHealth}`
);

// Level up
console.log("\n=== Level Up ===");
player.value.level += 1;
player.value.maxHealth += 10;
player.value.health = player.value.maxHealth;
player.value.experience = 0;
console.log(`Level: ${player.value.level}`);
console.log(`Max Health increased to: ${player.value.maxHealth}`);

// Check death
console.log("\n=== Death Check ===");
player.value.health = 0;
player.value.alive = player.value.health > 0;
console.log(`Alive: ${player.value.alive}`);

// Full state as JSON
console.log("\n=== Full Player State (JSON) ===");
console.log(JSON.stringify(player.toJSON(), null, 2));

// Demonstrate that get/set methods still work
console.log("\n=== Using get/set methods ===");
player.set("name", "Legendary Hero");
console.log("Name via get():", player.get("name"));
console.log("Name via property:", player.value.name);

// Access underlying DataView
console.log("\n=== Underlying Storage ===");
const view = player.getView();
console.log("DataView byte length:", view.byteLength);
console.log("Is DataView:", view instanceof DataView);
