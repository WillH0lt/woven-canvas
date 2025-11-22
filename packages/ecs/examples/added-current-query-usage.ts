/**
 * Example demonstrating the use of .added and .current query modifiers
 *
 * These modifiers allow systems to efficiently track:
 * - .added: entities that were newly added to the query since the last check
 * - .current: all entities currently matching the query
 */

import { component, field, System, World } from "../src/index.js";

// Define components
const Position = component({
  x: field.float32().default(0),
  y: field.float32().default(0),
});

const Velocity = component({
  dx: field.float32().default(0),
  dy: field.float32().default(0),
});

const Sprite = component({
  textureId: field.uint16().default(0),
  visible: field.boolean().default(true),
});

/**
 * System that handles entity initialization and updates
 *
 * This pattern is useful when:
 * - Entities need special initialization when first added
 * - You want to avoid re-initializing entities every frame
 * - You need to track state changes efficiently
 */
class MovementSystem extends System {
  // Query automatically tracks both added and current entities
  private movers = this.query((q) => q.with(Position, Velocity));

  public execute(): void {
    // Process newly added entities - perform initialization
    for (const entity of this.movers.added) {
      console.log(`New mover entity ${entity._getId()} added!`);

      const pos = entity.get(Position)!;
      const vel = entity.get(Velocity)!;

      // Initialize position based on velocity direction
      pos.value.x = vel.value.dx * 10;
      pos.value.y = vel.value.dy * 10;

      console.log(`  Initialized at (${pos.value.x}, ${pos.value.y})`);
    }

    // Process all current entities - regular update
    for (const entity of this.movers.current) {
      const pos = entity.get(Position)!;
      const vel = entity.get(Velocity)!;

      // Update position
      pos.value.x += vel.value.dx;
      pos.value.y += vel.value.dy;
    }
  }
}

/**
 * System that manages sprite rendering
 * Sets up rendering state for new sprites
 */
class RenderSystem extends System {
  // Track sprites - access .added to initialize new ones
  private sprites = this.query((q) => q.with(Position, Sprite));

  public execute(): void {
    // Initialize rendering for newly visible sprites
    for (const entity of this.sprites.added) {
      const sprite = entity.get(Sprite)!;
      const pos = entity.get(Position)!;

      console.log(
        `Setting up rendering for sprite ${sprite.value.textureId} ` +
          `at (${pos.value.x}, ${pos.value.y})`
      );

      // In a real implementation, this might:
      // - Upload sprite data to GPU
      // - Create render buffers
      // - Register with render batching system
    }
  }
}

// Example usage
function example() {
  const world = new World();
  const movementSystem = world.createSystem(MovementSystem);
  const renderSystem = world.createSystem(RenderSystem);

  console.log("=== Frame 1: Create initial entities ===");

  // Create first entity
  const entity1 = world.createEntity();
  entity1.add(Position, { x: 0, y: 0 });
  entity1.add(Velocity, { dx: 1, dy: 2 });
  entity1.add(Sprite, { textureId: 1 });

  // Run systems - System._afterExecute() automatically clears added after each execution
  movementSystem.execute();
  renderSystem.execute();

  console.log("\n=== Frame 2: Regular updates ===");

  // Run systems again - no initialization this time
  movementSystem.execute();
  renderSystem.execute();

  console.log("\n=== Frame 3: Add new entity ===");

  // Create second entity
  const entity2 = world.createEntity();
  entity2.add(Position, { x: 100, y: 100 });
  entity2.add(Velocity, { dx: -1, dy: 1 });
  entity2.add(Sprite, { textureId: 2 });

  // Run systems - only new entity gets initialized
  movementSystem.execute();
  renderSystem.execute();

  console.log("\n=== Frame 4: Component addition ===");

  // Create entity without Velocity initially
  const entity3 = world.createEntity();
  entity3.add(Position, { x: 50, y: 50 });
  entity3.add(Sprite, { textureId: 3 });

  // This won't appear in movers query yet
  movementSystem.execute();
  renderSystem.execute();

  console.log("\n=== Frame 5: Entity now matches query ===");

  // Add Velocity - now it matches the movers query
  entity3.add(Velocity, { dx: 0, dy: -1 });

  // Entity3 will be initialized by movement system
  movementSystem.execute();
  renderSystem.execute();

  // Cleanup
  world.dispose();
}

// Run the example
example();

/**
 * Expected output:
 *
 * === Frame 1: Create initial entities ===
 * New mover entity 1 added!
 *   Initialized at (10, 20)
 * Setting up rendering for sprite 1 at (10, 20)
 *
 * === Frame 2: Regular updates ===
 * (no initialization logs - entities already tracked)
 *
 * === Frame 3: Add new entity ===
 * New mover entity 2 added!
 *   Initialized at (-10, 10)
 * Setting up rendering for sprite 2 at (-10, 10)
 *
 * === Frame 4: Component addition ===
 * Setting up rendering for sprite 3 at (50, 50)
 *
 * === Frame 5: Entity now matches query ===
 * New mover entity 3 added!
 *   Initialized at (0, -10)
 */
