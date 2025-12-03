# ECS Component System Usage

A lightweight, type-safe ECS (Entity Component System) component library with a Zod-like API, backed by efficient binary storage using Structurae.

## Features

- 🔒 **Type-safe**: Full TypeScript support with type inference
- ⚡ **Fast**: Binary storage using DataView for efficient memory usage
- 🎯 **Zod-like API**: Familiar, fluent API for defining component schemas
- 📦 **Compact**: Minimal overhead, maximum performance
- 🔄 **Flexible Systems**: Run systems on the main thread or in parallel using Web Workers

## Quick Start

```typescript
import {
  World,
  defineComponent,
  defineSystem,
  defineWorkerSystem,
  field,
  query,
} from "@infinitecanvas/ecs";

// 1. Define components
const Position = defineComponent({
  x: field.float32(),
  y: field.float32(),
});

const Velocity = defineComponent({
  x: field.float32(),
  y: field.float32(),
});

// 2. Create a world
const world = new World({ Position, Velocity });

// 3. Create entities
const entity = world.createEntity();
world.addComponent(entity, Position, { x: 0, y: 0 });
world.addComponent(entity, Velocity, { x: 1, y: 1 });

// 4. Define systems
const movementSystem = defineSystem(
  (ctx) => {
    const entities = query(ctx, (q) => q.with(Position, Velocity));
    for (const id of entities) {
      const pos = Position.write(id);
      const vel = Velocity.read(id);
      pos.x += vel.x;
      pos.y += vel.y;
    }
  },
  { Position, Velocity }
);

// 5. Run systems
async function gameLoop() {
  await world.execute(movementSystem);
  requestAnimationFrame(gameLoop);
}
gameLoop();
```

For detailed information about systems, see [SYSTEMS.md](./docs/SYSTEMS.md).

## Basic Usage

### Defining Components

```typescript
import { ecs, component } from "@infinitecanvas/ecs";

// Define a simple component
const Position = component("Position", {
  x: ecs.float32(),
  y: ecs.float32(),
  z: ecs.float32(),
});

// Create an instance
const position = Position._from({ x: 10, y: 20, z: 30 });

// Access properties directly (recommended)
console.log(position.x); // 10
console.log(position.y); // 20

// Set values directly
position.x = 15;
console.log(position.x); // 15

// Or use explicit get/set methods (also available)
console.log(position.get("x")); // 15
position.set("x", 20);

// Convert to plain object
console.log(position.toJSON()); // { x: 20, y: 20, z: 30 }
```

### Available Field Types

#### String

```typescript
const User = component("User", {
  name: ecs.string().max(50),
  email: ecs.string().max(100).default("unknown@example.com"),
});
```

#### Numbers

```typescript
const Stats = component("Stats", {
  // Unsigned integers
  age: ecs.uint8(), // 0 to 255
  health: ecs.uint16(), // 0 to 65,535
  score: ecs.uint32(), // 0 to 4,294,967,295

  // Signed integers
  temperature: ecs.int8(), // -128 to 127
  altitude: ecs.int16(), // -32,768 to 32,767
  balance: ecs.int32(), // -2,147,483,648 to 2,147,483,647

  // Floating point
  speed: ecs.float32(), // 32-bit float
  precision: ecs.float64(), // 64-bit float (double)
});
```

#### Boolean

```typescript
const Flags = component("Flags", {
  enabled: ecs.boolean().default(true),
  visible: ecs.boolean(),
});
```

### Default Values

```typescript
const Player = component("Player", {
  name: ecs.string().max(30).default("Player"),
  health: ecs.uint16().default(100),
  speed: ecs.float32().default(5.0),
  alive: ecs.boolean().default(true),
});

// Create with defaults
const player = Player._from({});
console.log(player.toJSON());
// { name: "Player", health: 100, speed: 5.0, alive: true }

// Override defaults
const customPlayer = Player._from({ name: "Hero", health: 150 });
console.log(customPlayer.name); // "Hero"
console.log(customPlayer.health); // 150
console.log(customPlayer.speed); // 5.0 (default)
console.log(customPlayer.alive); // true (default)
```

## Real-World Examples

### Transform Component

```typescript
const Transform = component("Transform", {
  posX: ecs.float32().default(0),
  posY: ecs.float32().default(0),
  posZ: ecs.float32().default(0),
  rotX: ecs.float32().default(0),
  rotY: ecs.float32().default(0),
  rotZ: ecs.float32().default(0),
  scaleX: ecs.float32().default(1),
  scaleY: ecs.float32().default(1),
  scaleZ: ecs.float32().default(1),
});

const transform = Transform._from({
  posX: 100,
  posY: 50,
});
```

### Health Component

```typescript
const Health = component("Health", {
  current: ecs.uint16(),
  max: ecs.uint16(),
  regeneration: ecs.float32().default(0),
  invulnerable: ecs.boolean().default(false),
});

const health = Health._from({
  current: 80,
  max: 100,
  regeneration: 1.5,
});

// Take damage
health.current -= 10;

// Heal (clamped to max)
health.current = Math.min(health.current + 20, health.max);

// Check if dead
if (health.current <= 0) {
  console.log("Player died!");
}
```

### Inventory Component

```typescript
const Inventory = component("Inventory", {
  slots: ecs.uint8().default(20),
  usedSlots: ecs.uint8().default(0),
  maxWeight: ecs.float32().default(100),
  currentWeight: ecs.float32().default(0),
});

const inventory = Inventory._from({
  slots: 30,
  maxWeight: 150,
});

// Add an item
inventory.usedSlots += 1;
inventory.currentWeight += 5.5;

// Check if full
if (inventory.usedSlots >= inventory.slots) {
  console.log("Inventory is full!");
}
```

## API Reference

### `ecs` Object

The main namespace containing all field type constructors:

- `ecs.string()` - String field
- `ecs.uint8()` - 8-bit unsigned integer (0-255)
- `ecs.uint16()` - 16-bit unsigned integer (0-65,535)
- `ecs.uint32()` - 32-bit unsigned integer (0-4,294,967,295)
- `ecs.int8()` - 8-bit signed integer (-128 to 127)
- `ecs.int16()` - 16-bit signed integer (-32,768 to 32,767)
- `ecs.int32()` - 32-bit signed integer (-2,147,483,648 to 2,147,483,647)
- `ecs.float32()` - 32-bit floating point
- `ecs.float64()` - 64-bit floating point
- `ecs.boolean()` - Boolean value

### Field Methods

#### String Fields

- `.max(length: number)` - Set maximum string length
- `.default(value: string)` - Set default value

#### Numeric Fields

- `.default(value: number)` - Set default value

#### Boolean Fields

- `.default(value: boolean)` - Set default value

### Component Methods

#### `component(id: string, schema: ComponentSchema)`

Creates a component definition.

#### `Component.frame(data: unknown)`

Parses and validates data.

### Component Instance Methods

#### `instance.get(field: keyof T)`

Gets the value of a field.

#### `instance.set(field: keyof T, value: T[field])`

Sets the value of a field.

#### `instance.toJSON()`

Converts the component to a plain JavaScript object.

#### `instance.getView()`

Gets the underlying DataView for advanced usage.

## Benefits

### Memory Efficiency

Components are stored as binary data using DataView, resulting in compact memory footprint compared to plain JavaScript objects.

### Type Safety

Full TypeScript support ensures you can't access fields that don't exist or assign values of the wrong type.

### Performance

Binary storage and minimal overhead make this ideal for games and real-time applications that need to manage thousands of entities.

## Query Tracking: `.added`, `.current`, and `.removed`

The ECS system supports efficient tracking of entity state changes through query modifiers. This is particularly useful for:

- Initializing entities when they first match a query
- Cleaning up resources when entities are removed
- Avoiding redundant initialization every frame
- Efficiently handling entity state transitions

### Basic Usage

```typescript
import { World, System, component, field } from "@infinitecanvas/ecs";

const Position = component({
  x: field.float32().default(0),
  y: field.float32().default(0),
});

const Velocity = component({
  dx: field.float32().default(0),
  dy: field.float32().default(0),
});

class MoveSystem extends System {
  // Track added, current, and removed entities
  private movers = this.query((q) => q.with(Position, Velocity));

  public execute(): void {
    // Process newly added entities - perform initialization
    for (const entity of this.movers.added) {
      const pos = entity.get(Position)!;
      console.log(`Initializing entity at (${pos.value.x}, ${pos.value.y})`);

      // Special initialization logic for new entities
      pos.value.x += 10;
      pos.value.y += 10;
    }

    // Process all current entities - regular update
    for (const entity of this.movers.current) {
      const pos = entity.get(Position)!;
      const vel = entity.get(Velocity)!;

      // Regular movement update
      pos.value.x += vel.value.dx;
      pos.value.y += vel.value.dy;
    }

    // Process removed entities - perform cleanup
    for (const entity of this.movers.removed) {
      const pos = entity.get(Position)!;
      console.log(`Cleaning up entity at (${pos.value.x}, ${pos.value.y})`);

      // Clean up resources, send network messages, etc.
    }
  }
}

// Usage in game loop
const world = new World();
const moveSystem = new MoveSystem(world);

// Frame 1: Create entity
const entity = world.createEntity();
entity.add(Position, { x: 0, y: 0 });
entity.add(Velocity, { dx: 1, dy: 2 });

world.execute(moveSystem); // Entity appears in .added and .current
// world.execute() automatically calls _beforeExecute() which clears added tracking

// Frame 2: Regular update
world.execute(moveSystem); // Entity only in .current, not .added
```

### Query Modifiers

#### `.added`

Tracks entities that newly match the query since the last system execution.

```typescript
// Track newly added entities
private newSprites = this.query((q) => q.with(Sprite, Position));

for (const entity of this.newSprites.added) {
  // Initialize sprite rendering
}
```

#### `.current`

Provides access to all entities currently matching the query.

```typescript
// Access all matching entities
private allMovers = this.query((q) => q.with(Position, Velocity));

for (const entity of this.allMovers.current) {
  // Update all matching entities
}
```

#### `.removed`

Tracks entities that were removed from the query since the last system execution. This includes:

- Entities that were removed from the world
- Entities that had components removed, causing them to no longer match the query

```typescript
// Track removed entities for cleanup
private syncedEntities = this.query((q) => q.with(Position, NetworkSync));

for (const entity of this.syncedEntities.removed) {
  // Clean up resources, send DELETE messages, etc.
  const sync = entity.get(NetworkSync)!;
  console.log(`Cleaning up entity ${sync.value.entityId}`);
}
```

### Automatic Tracking Cleanup

When using systems, added and removed entity tracking is automatically cleared after each `execute()` call via the system lifecycle. This means:

```typescript
class MySystem extends System {
  private movers = this.query((q) => q.with(Position, Velocity));

  execute() {
    // Process newly added entities
    for (const entity of this.movers.added) {
      // Initialize entity
    }

    // Process removed entities
    for (const entity of this.movers.removed) {
      // Clean up entity
    }
  }
  // Added and removed lists are automatically cleared after this method
}

// In your game loop
world.execute(mySystem); // Frame 1: entities in .added
world.execute(mySystem); // Frame 2: only new entities in .added, previous ones cleared
```

For queries created outside of systems, the tracking lists are cleared automatically when `_prepare()` is called at the start of the next frame.

### When Entities Appear in Tracking Lists

#### `.added`

Entities appear in the `.added` list when:

1. A new entity is created with matching components
2. Components are added to an entity, making it match the query
3. An entity is re-added after being removed (if it matches the query again)

#### `.removed`

Entities appear in the `.removed` list when:

1. An entity is removed from the world via `world.removeEntity(entity)`
2. Components are removed from an entity, causing it to no longer match the query
3. An entity's component composition changes in a way that makes it no longer match

### Chaining Order

The modifiers can be chained in any order and are always available:

```typescript
// All equivalent - added, current, and removed are always accessible
q.with(Position);
q.with(Position).with(Velocity);
```

### Use Cases

#### Initialization with `.added`

```typescript
class SpriteSystem extends System {
  private sprites = this.query((q) => q.with(Sprite, Position));

  execute() {
    for (const entity of this.sprites.added) {
      // Load textures, initialize rendering data
      const sprite = entity.get(Sprite)!;
      console.log(`Loading sprite: ${sprite.value.texturePath}`);
    }
  }
}
```

#### Cleanup with `.removed`

```typescript
class ResourceSystem extends System {
  private resources = this.query((q) => q.with(Position, Resource));

  execute() {
    for (const entity of this.resources.removed) {
      // Free memory, close connections, save state
      const resource = entity.get(Resource)!;
      console.log(`Freeing resource: ${resource.value.id}`);
    }
  }
}
```

#### Network Synchronization

```typescript
class NetworkSystem extends System {
  private synced = this.query((q) => q.with(Position, NetworkSync));

  execute() {
    // Send CREATE messages for new entities
    for (const entity of this.synced.added) {
      this.sendCreateMessage(entity);
    }

    // Send UPDATE messages for existing entities
    for (const entity of this.synced.current) {
      this.sendUpdateMessage(entity);
    }

    // Send DELETE messages for removed entities
    for (const entity of this.synced.removed) {
      this.sendDeleteMessage(entity);
    }
  }
}
```

### Complete Examples

See the examples directory for complete working examples:

- `examples/added-current-query-usage.ts` - Entity initialization and regular updates
- `examples/removed-query-usage.ts` - Resource cleanup and network synchronization
