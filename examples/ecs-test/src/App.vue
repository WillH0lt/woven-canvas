<template>
  <div
    v-for="(entity, eid) in state"
    :key="eid"
    :style="{
      position: 'absolute',
      width: (entity.Size?.width ?? 50) + 'px',
      height: (entity.Size?.height ?? 50) + 'px',
      left: (entity.Position?.x ?? 0) + 'px',
      top: (entity.Position?.y ?? 0) + 'px',
      backgroundColor: `rgb(${entity.Color?.red ?? 255}, ${
        entity.Color?.green ?? 0
      }, ${entity.Color?.blue ?? 0})`,
    }"
    @click="changeColor(Number(eid))"
  ></div>
</template>

<script setup lang="ts">
import {
  defineSystem,
  createEntity,
  getBackrefs,
  addComponent,
  removeEntity,
  World,
  type Context,
  useQuery,
  removeComponent,
  hasComponent,
  type WorldSyncResult,
} from "@infinitecanvas/ecs";
import { reactive } from "vue";

import * as components from "./components";

const world = new World(Object.values(components), { threads: 4 });
const ctx = world.getContext();

// Create some blocks before initializing Store
for (let i = 0; i < 1; i++) {
  const block1 = createEntity(ctx);
  addComponent(ctx, block1, components.Velocity, {
    x: Math.random() * 5,
    y: Math.random() * 5,
  });
  addComponent(ctx, block1, components.Position, { x: 200, y: 200 });
  addComponent(ctx, block1, components.Size, { width: 50, height: 50 });
  addComponent(ctx, block1, components.Color, { red: 255, green: 0, blue: 0 });
}

// Change color via the store (demonstrates Store -> ECS sync)
function changeColor(entityId: number) {
  // need to defer writes to the start of the frame
  const color = components.Color.write(ctx, entityId);
}

const query = useQuery((q) =>
  q
    .with(components.Position, components.Velocity, components.Size)
    .tracking(components.Color)
);

// Define main thread systems
const system1 = defineSystem((ctx: Context) => {
  for (const eid of query.current(ctx)) {
    const pos = components.Position.write(ctx, eid);
    const vel = components.Velocity.write(ctx, eid);
    const size = components.Size.read(ctx, eid);

    pos.x += vel.x * 0.1;
    pos.y += vel.y * 0.1;

    if (pos.x <= 0 || pos.x + size.width >= window.innerWidth) {
      vel.x *= -1;
      pos.x = Math.max(0, Math.min(pos.x, window.innerWidth - size.width));
    }

    if (pos.y <= 0 || pos.y + size.height >= window.innerHeight) {
      vel.y *= -1;
      pos.y = Math.max(0, Math.min(pos.y, window.innerHeight - size.height));
    }
  }
  // for (const eid of query.changed(ctx)) {
  //   const color = components.Color.read(ctx, eid);
  //   console.log(`color: ${color.red}, ${color.green}, ${color.blue}`);
  // }
});

// // data in
// // get all these methods to work when called with world context

// // can work already
// createEntity(ctx);

// // needs to be defered to start of the frame
// removeEntity(ctx, 1);
// addComponent(ctx, 1, Position, { x: 200, y: 200 });
// removeComponent(ctx, 1, Position);

// // can work already
// getBackrefs(ctx, 1, Position, "x");
// hasComponent(ctx, 1, Position);

// // can work
// query.current(ctx);

const state = reactive<Record<number, any>>({});

const stateQuery = useQuery((q) =>
  q.tracking(components.Position, components.Size, components.Color)
);

world.subscribe(stateQuery, ({ added, removed, changed }) => {
  // preferred way to sync data from world -> application
  for (const entityId of added) {
    state[entityId] = {};
    // Read all component data for newly added entity
    // const pos = components.Position.read(ctx, entityId);
    // const size = components.Size.read(ctx, entityId);
    // const color = components.Color.read(ctx, entityId);
    state[entityId].Position = components.Position.read(ctx, entityId);
    state[entityId].Size = components.Size.read(ctx, entityId);
    state[entityId].Color = components.Color.read(ctx, entityId);
  }
  for (const entityId of removed) {
    delete state[entityId];
  }
  for (const entityId of changed) {
    // Re-read all tracked components for changed entities
    if (state[entityId]) {
      state[entityId].Position = components.Position.read(ctx, entityId);
      state[entityId].Size = components.Size.read(ctx, entityId);
      state[entityId].Color = components.Color.read(ctx, entityId);
    }
  }
});

// // data out
// world.subscribe(query, (event) => {
//   for (const eid of event.added) {
//     console.log(`Entity ${eid} added to query`);
//   }
//   for (const eid of event.removed) {
//     console.log(`Entity ${eid} removed from query`);
//   }
//   for (const eid of event.changed) {
//     console.log(`Entity ${eid} changed in query`);
//   }
// });

async function loop() {
  world.sync();

  await world.execute(system1);

  // await world.frame(async (execute) => {
  //   await execute(system1);
  // });

  requestAnimationFrame(loop);
}

loop();
</script>
