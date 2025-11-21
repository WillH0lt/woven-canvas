import { component, field, System, World } from "../src/index.js";

/**
 * Example: Using .removed query for cleanup logic
 *
 * This demonstrates how to track entities that were removed from a query
 * to perform cleanup operations, similar to how .added tracks new entities.
 */

// Define components
const Position = component({
  x: field.float32().default(0),
  y: field.float32().default(0),
});

const NetworkSync = component({
  entityId: field.uint32().default(0),
  lastSyncTime: field.uint32().default(0),
});

const Active = component({
  value: field.boolean().default(true),
});

// System that manages network synchronization and cleanup
class NetworkSyncSystem extends System {
  private syncedEntities = this.query((q) => q.with(Position, NetworkSync));

  public execute(): void {
    // Handle newly added entities - send CREATE message to server
    console.log("\n--- Handling Added Entities ---");
    for (const entity of this.syncedEntities.added) {
      const pos = entity.get(Position)!;
      const sync = entity.get(NetworkSync)!;

      console.log(
        `[NETWORK] Creating entity ${sync.value.entityId} at (${pos.value.x}, ${pos.value.y})`
      );
      // In a real application:
      // - Send CREATE message to server
      // - Register entity in network manager
      // - Set up sync interval
    }

    // Handle removed entities - send DELETE message to server
    console.log("\n--- Handling Removed Entities ---");
    for (const entity of this.syncedEntities.removed) {
      const sync = entity.get(NetworkSync)!;

      console.log(`[NETWORK] Cleaning up entity ${sync.value.entityId}`);
      // In a real application:
      // - Send DELETE message to server
      // - Unregister from network manager
      // - Clean up any pending sync operations
      // - Remove from any caches
    }

    // Update current entities - send UPDATE messages
    console.log("\n--- Updating Current Entities ---");
    for (const entity of this.syncedEntities.current) {
      const pos = entity.get(Position)!;
      const sync = entity.get(NetworkSync)!;

      // Only log if there are entities to update
      if (this.syncedEntities.current.length > 0) {
        console.log(
          `[NETWORK] Syncing entity ${sync.value.entityId} at (${pos.value.x}, ${pos.value.y})`
        );
      }
    }
  }
}

// Another example: Resource cleanup system
class ResourceCleanupSystem extends System {
  private resourceEntities = this.query((q) => q.with(Position, Active));

  public execute(): void {
    // Clean up resources for entities that became inactive or were removed
    for (const entity of this.resourceEntities.removed) {
      const pos = entity.get(Position)!;

      console.log(
        `[CLEANUP] Releasing resources for entity at (${pos.value.x}, ${pos.value.y})`
      );
      // In a real application:
      // - Free memory
      // - Close file handles
      // - Unload textures/meshes
      // - Cancel pending operations
    }
  }
}

// Run the example
function main() {
  const world = new World();
  const networkSystem = world.createSystem(NetworkSyncSystem);
  const cleanupSystem = world.createSystem(ResourceCleanupSystem);

  console.log("=== Frame 1: Creating entities ===");
  const player = world.createEntity();
  player.add(Position, { x: 100, y: 200 });
  player.add(NetworkSync, { entityId: 1001, lastSyncTime: 0 });
  player.add(Active);

  const enemy = world.createEntity();
  enemy.add(Position, { x: 500, y: 300 });
  enemy.add(NetworkSync, { entityId: 1002, lastSyncTime: 0 });
  enemy.add(Active);

  networkSystem.execute();
  cleanupSystem.execute();

  console.log("\n=== Frame 2: Normal operation ===");
  networkSystem.execute();
  cleanupSystem.execute();

  console.log("\n=== Frame 3: Removing enemy entity ===");
  world.removeEntity(enemy);
  networkSystem.execute();
  cleanupSystem.execute();

  console.log("\n=== Frame 4: Creating new entity and deactivating player ===");
  const item = world.createEntity();
  item.add(Position, { x: 250, y: 250 });
  item.add(NetworkSync, { entityId: 1003, lastSyncTime: 0 });
  item.add(Active);

  // Removing Active component will remove player from Active query
  player.remove(Active);

  networkSystem.execute();
  cleanupSystem.execute();

  console.log("\n=== Frame 5: Normal operation again ===");
  networkSystem.execute();
  cleanupSystem.execute();
}

main();
