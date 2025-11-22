import { field, World, System, type Entity } from "../src/index";

/**
 * Example: Complex query with multiple conditions
 */
function main() {
  console.log("=== ECS Query System Demo ===\n");

  // Create world
  const world = new World();

  // Define components for a simple game
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

  const Enemy = world.createComponent({
    damage: field.uint8().default(10),
    aiType: field.uint8().default(0),
  });

  const Player = world.createComponent({
    score: field.uint32().default(0),
  });

  const Renderable = world.createComponent({
    visible: field.boolean().default(true),
    sprite: field.uint8().default(0),
  });

  const Block = world.createComponent({
    type: field.uint8().default(1),
  });

  const Edited = world.createComponent({
    timestamp: field.uint32().default(0),
  }););

  /**
   * Example System: Handles movement for all entities with Position and Velocity
   */
  class MovementSystem extends System {
  // Define a query for entities that can move
  private movingEntities = this.query((q) => q.with(Position, Velocity));

  public execute(): void {
    for (const entity of this.movingEntities.current) {
      const pos = entity.get(Position)!;
      const vel = entity.get(Velocity)!;

      // Update position based on velocity
      pos.value.x += vel.value.dx;
      pos.value.y += vel.value.dy;
    }

    console.log(`Moved ${this.movingEntities.count} entities`);
  }
}

/**
 * Example System: Processes edited blocks
 */
class BlockEditSystem extends System {
  private editedBlocks = this.query((q) => q.with(Block, Edited));

  public execute(): void {
    for (const entity of this.editedBlocks.current) {
      const block = entity.get(Block)!;
      const edited = entity.get(Edited)!;

      console.log(
        `Processing edited block of type ${block.value.type} at ${edited.value.timestamp}`
      );

      // After processing, remove the Edited component
      entity.remove(Edited);
    }
  }
}

/**
 * Example System: Handles combat between player and enemies
 */
class CombatSystem extends System {
  // Query for the player entity
  private playerQuery = this.query((q) => q.with(Player, Position, Health));
  // Query for enemy entities
  private enemyQuery = this.query((q) => q.with(Enemy, Position, Health));

  public execute(): void {
    const player = this.playerQuery.first;
    if (!player) return;

    const playerPos = player.get(Position)!;
    const playerHealth = player.get(Health)!;

    // Check for enemies near player
    for (const enemy of this.enemyQuery.current) {
      const enemyPos = enemy.get(Position)!;
      const enemyData = enemy.get(Enemy)!;

      // Simple distance check
      const dx = playerPos.value.x - enemyPos.value.x;
      const dy = playerPos.value.y - enemyPos.value.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 50) {
        // Enemy is in range, deal damage to player
        playerHealth.value.current -= enemyData.value.damage;
        console.log(
          `Player took ${enemyData.value.damage} damage! Health: ${playerHealth.value.current}/${playerHealth.value.max}`
        );
      }
    }
  }
}

/**
 * Example System: Renders visible entities
 */
class RenderSystem extends System {
  // Query for all visible, renderable entities with position
  private renderableEntities = this.query((q) => q.with(Position, Renderable));
  // Separate query for player (different rendering)
  private playerEntities = this.query((q) =>
    q.with(Position, Player, Renderable)
  );
  // Query for enemies
  private enemyEntities = this.query((q) =>
    q.with(Position, Enemy, Renderable)
  );

  public execute(): void {
    console.log("\n=== Rendering Frame ===");

    // Render player
    for (const entity of this.playerEntities.current) {
      const pos = entity.get(Position)!;
      const renderable = entity.get(Renderable)!;

      if (renderable.value.visible) {
        console.log(`[PLAYER] at (${pos.value.x}, ${pos.value.y})`);
      }
    }

    // Render enemies
    for (const entity of this.enemyEntities.current) {
      const pos = entity.get(Position)!;
      const renderable = entity.get(Renderable)!;

      if (renderable.value.visible) {
        console.log(`[ENEMY] at (${pos.value.x}, ${pos.value.y})`);
      }
    }

    console.log(`Total renderable entities: ${this.renderableEntities.count}`);
  }
}

/**
 * Example System: Cleans up dead entities
 */
class DeathSystem extends System {
  // Query for entities with zero health
  private entities = this.query((q) => q.with(Health));

  public execute(): void {
    const entitiesToRemove: Entity[] = [];

    for (const entity of this.entities.current) {
      const health = entity.get(Health)!;

      if (health.value.current <= 0) {
        console.log(`Entity ${entity._getId()} died`);
        entitiesToRemove.push(entity);
      }
    }

    // Remove dead entities
    for (const entity of entitiesToRemove) {
      this.removeEntity(entity);
    }
  }
}

/**
 * Example: Complex query with multiple conditions
 */
class AISystem extends System {
  // Query for enemies that are alive and moving, but not rendered
  private activeEnemies = this.query((q) =>
    q.with(Enemy, Position, Velocity, Health).without(Renderable)
  );
  // Query for enemies that need AI processing (any enemy type)
  private enemiesNeedingAI = this.query((q) => q.with(Enemy, Position));

  public execute(): void {
    console.log(`Processing AI for ${this.enemiesNeedingAI.count} enemies`);
    console.log(`Active off-screen enemies: ${this.activeEnemies.count}`);

    for (const entity of this.enemiesNeedingAI.current) {
      const enemy = entity.get(Enemy)!;
      const pos = entity.get(Position)!;

      // Simple AI: move toward origin
      if (pos.value.x > 0) pos.value.x -= 0.5;
      if (pos.value.y > 0) pos.value.y -= 0.5;
    }
  }

  // ===== Usage Example =====

  // Create systems
  const movementSystem = world.createSystem(MovementSystem);
  const combatSystem = world.createSystem(CombatSystem);
  const renderSystem = world.createSystem(RenderSystem);
  const deathSystem = world.createSystem(DeathSystem);
  const blockEditSystem = world.createSystem(BlockEditSystem);
  const aiSystem = world.createSystem(AISystem);

  // Create player entity
  const player = world.createEntity();
  player.add(Player, { score: 0 });
  player.add(Position, { x: 100, y: 100 });
  player.add(Health, { current: 100, max: 100 });
  player.add(Renderable, { visible: true, sprite: 1 });

  // Create some enemies
  for (let i = 0; i < 3; i++) {
    const enemy = world.createEntity();
    enemy.add(Enemy, { damage: 5 + i * 2, aiType: i });
    enemy.add(Position, { x: 50 + i * 30, y: 80 + i * 20 });
    enemy.add(Velocity, { dx: 0.5 - i * 0.2, dy: 0.3 });
    enemy.add(Health, { current: 50, max: 50 });
    enemy.add(Renderable, { visible: true, sprite: 2 });
  }

  // Create some blocks
  const block1 = world.createEntity();
  block1.add(Block, { type: 1 });
  block1.add(Position, { x: 200, y: 200 });

  const block2 = world.createEntity();
  block2.add(Block, { type: 2 });
  block2.add(Position, { x: 250, y: 250 });
  block2.add(Edited, { timestamp: Date.now() });

  // Create a static entity
  const staticEntity = world.createEntity();
  staticEntity.add(Position, { x: 300, y: 300 });
  staticEntity.add(Renderable, { visible: true, sprite: 0 });

  console.log(`Total entities created: ${world.getEntityCount()}\n`);

  // Run game loop for a few frames
  for (let frame = 0; frame < 3; frame++) {
    console.log(`\n===== FRAME ${frame + 1} =====`);

    movementSystem.execute();
    combatSystem.execute();
    aiSystem.execute();
    blockEditSystem.execute();
    renderSystem.execute();
    deathSystem.execute();

    console.log(`\nEntities remaining: ${world.getEntityCount()}`);
  }

  // Cleanup
  world.dispose();
  console.log("\n=== Demo Complete ===");
}

// Run the demo
main();
