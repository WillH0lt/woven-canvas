/**
 * Example demonstrating the .tracking() feature for queries
 *
 * The .tracking() method allows you to specify which components to monitor for value changes.
 * When a tracked component's value changes, the entity will appear in query.changed
 */

import { field, System, World } from "../src/index.js";

function main() {
  console.log("=== ECS Change Tracking Demo ===\n");

  // Create world
  const world = new World();

  // Define components
  const Position = world.createComponent({
    x: field.float32().default(0),
    y: field.float32().default(0),
  });

  const Velocity = world.createComponent({
    dx: field.float32().default(0),
    dy: field.float32().default(0),
  });

  const Health = world.createComponent({
    current: field.uint16().default(100),
    max: field.uint16().default(100),
  });

  // Example 1: Track changes to a single component
  class PositionChangeLogger extends System {
  // Track changes to Position component only
  private movers = this.query((q) => q.withTracked(Position));

  public execute(): void {
    // Log entities whose position changed
    for (const entity of this.movers.changed) {
      const pos = entity.get(Position)!;
      console.log(
        `Entity position changed to (${pos.value.x}, ${pos.value.y})`
      );
    }
  }

  // Example 2: Track changes to multiple components
  class CombatSystem extends System {
  // Track changes to both Position and Health
  private combatants = this.query((q) => q.withTracked(Position, Health));

  public execute(): void {
    // Process entities whose position or health changed
    for (const entity of this.combatants.changed) {
      const pos = entity.get(Position)!;
      const health = entity.get(Health)!;

      console.log(
        `Combatant changed - Position: (${pos.value.x}, ${pos.value.y}), Health: ${health.value.current}/${health.value.max}`
      );
    }
  }

  // Example 3: Track specific component in multi-component query
  class MovementSystem extends System {
  // Only track Position changes, even though we also require Velocity
  private entities = this.query((q) => q.withTracked(Position).with(Velocity));

  public execute(): void {
    console.log("\n--- Frame Update ---");

    // Log newly added entities
    for (const entity of this.entities.added) {
      console.log("New entity added to movement system");
    }

    // Log entities whose position changed (from external sources)
    for (const entity of this.entities.changed) {
      console.log("Entity position was modified externally");
    }

    // Update all moving entities
    for (const entity of this.entities.current) {
      const pos = entity.get(Position)!;
      const vel = entity.get(Velocity)!;

      pos.value.x += vel.value.dx;
      pos.value.y += vel.value.dy;
    }
  }
}

// Demo usage
function demo() {
  const world = new World();

  const movementSystem = world.createSystem(MovementSystem);
  const loggerSystem = world.createSystem(PositionChangeLogger);

  // Create an entity
  const player = world.createEntity();
  player.add(Position, { x: 0, y: 0 });
  player.add(Velocity, { dx: 1, dy: 1 });

  console.log("=== Frame 1: New entity ===");
  world.execute(movementSystem);
  world.execute(loggerSystem);

  console.log("\n=== Frame 2: Movement updates position ===");
  world.execute(movementSystem);
  world.execute(loggerSystem);

  console.log("\n=== Frame 3: External position modification ===");
  // Simulate external position change (e.g., teleport)
  player.get(Position)!.value.x = 100;
  player.get(Position)!.value.y = 100;

  world.execute(movementSystem);
  world.execute(loggerSystem);

  console.log("\n=== Frame 4: Normal movement ===");
  world.execute(movementSystem);
  world.execute(loggerSystem);
}

// Run the demo
main();

