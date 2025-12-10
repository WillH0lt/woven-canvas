import { useEffect, useState } from "react";
import {
  type Context,
  defineSystem,
  createEntity,
  addComponent,
  World,
  defineQuery,
  field,
  defineComponent,
} from "@infinitecanvas/ecs";

// Define ECS components
const Velocity = defineComponent({
  x: field.float32(),
  y: field.float32(),
});

const Position = defineComponent({
  x: field.float32(),
  y: field.float32(),
});

const Size = defineComponent({
  width: field.float32().default(50),
  height: field.float32().default(50),
});

const Color = defineComponent({
  red: field.uint8().default(255),
  green: field.uint8().default(0),
  blue: field.uint8().default(0),
});

// Create the ECS world
const world = new World([Velocity, Position, Size, Color]);

// Query for entities with Position, Size, and Color (tracking changes)
// eslint-disable-next-line react-hooks/rules-of-hooks
const blocks = defineQuery((q) => q.tracking(Position, Size, Color));

// Movement system - handles physics and boundary collision
const movementSystem = defineSystem((ctx: Context) => {
  for (const eid of blocks.current(ctx)) {
    const pos = Position.write(ctx, eid);
    const vel = Velocity.write(ctx, eid);
    const size = Size.read(ctx, eid);

    // Apply velocity
    pos.x += vel.x;
    pos.y += vel.y;

    // Bounce off walls (DVD screensaver style)
    if (pos.x <= 0 || pos.x + size.width >= window.innerWidth) {
      vel.x *= -1;
      pos.x = Math.max(0, Math.min(pos.x, window.innerWidth - size.width));
    }

    if (pos.y <= 0 || pos.y + size.height >= window.innerHeight) {
      vel.y *= -1;
      pos.y = Math.max(0, Math.min(pos.y, window.innerHeight - size.height));
    }
  }
});

// Initialize entities
world.nextSync((ctx) => {
  for (let i = 0; i < 15; i++) {
    const entity = createEntity(ctx);

    addComponent(ctx, entity, Velocity, {
      x: (Math.random() - 0.5) * 4 + (Math.random() > 0.5 ? 1 : -1),
      y: (Math.random() - 0.5) * 4 + (Math.random() > 0.5 ? 1 : -1),
    });
    addComponent(ctx, entity, Position, {
      x: Math.random() * (window.innerWidth - 100),
      y: Math.random() * (window.innerHeight - 100),
    });
    addComponent(ctx, entity, Size, {
      width: Math.random() * 100 + 50,
      height: Math.random() * 100 + 50,
    });
    addComponent(ctx, entity, Color, {
      red: Math.floor(Math.random() * 256),
      green: Math.floor(Math.random() * 256),
      blue: Math.floor(Math.random() * 256),
    });
  }
});

// Entity state type for React
interface EntityState {
  Position: { x: number; y: number };
  Size: { width: number; height: number };
  Color: { red: number; green: number; blue: number };
}

function App() {
  const [entities, setEntities] = useState<Record<number, EntityState>>({});

  useEffect(() => {
    // Subscribe to entity changes and sync to React state
    world.subscribe(blocks, (ctx, { added, removed, changed }) => {
      setEntities((prev) => {
        const next = { ...prev };

        // Add new entities
        for (const eid of added) {
          next[eid] = {
            Position: Position.snapshot(ctx, eid),
            Size: Size.snapshot(ctx, eid),
            Color: Color.snapshot(ctx, eid),
          };
        }

        // Remove deleted entities
        for (const eid of removed) {
          delete next[eid];
        }

        // Update changed entities
        for (const eid of changed) {
          if (next[eid]) {
            next[eid] = {
              Position: Position.snapshot(ctx, eid),
              Size: Size.snapshot(ctx, eid),
              Color: Color.snapshot(ctx, eid),
            };
          }
        }

        return next;
      });
    });

    // Animation loop
    let running = true;
    async function loop() {
      if (!running) return;
      requestAnimationFrame(loop);

      world.sync();
      await world.execute(movementSystem);
    }
    loop();

    // Cleanup
    return () => {
      running = false;
    };
  }, []);

  // Change color on click
  const handleClick = (entityId: number) => {
    world.nextSync((ctx) => {
      const color = Color.write(ctx, entityId);
      color.red = Math.floor(Math.random() * 256);
      color.green = Math.floor(Math.random() * 256);
      color.blue = Math.floor(Math.random() * 256);
    });
  };

  return (
    <div className="container">
      {Object.entries(entities).map(([eid, entity]) => (
        <div
          key={eid}
          className="block"
          onClick={() => handleClick(Number(eid))}
          style={{
            width: entity.Size.width,
            height: entity.Size.height,
            left: entity.Position.x,
            top: entity.Position.y,
            backgroundColor: `rgb(${entity.Color.red}, ${entity.Color.green}, ${entity.Color.blue})`,
          }}
        />
      ))}
    </div>
  );
}

export default App;
