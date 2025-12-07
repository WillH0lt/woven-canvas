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
  defineWorkerSystem,
  createEntity,
  addComponent,
  World,
  useSingleton,
  type Context,
  Store,
  useQuery,
  useVueStore,
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

// Initialize Store - automatically syncs with existing entities
const store = new Store(world);
const state = useVueStore(store, reactive);

// Change color via the store (demonstrates Store -> ECS sync)
function changeColor(entityId: number) {
  store.set(entityId, components.Color, {
    red: Math.floor(Math.random() * 255),
    green: Math.floor(Math.random() * 255),
    blue: Math.floor(Math.random() * 255),
  });
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

// data in
addComponent(ctx, 0, Position, { x: 100, y: 100 });
createEntity(ctx);
getBackrefs(ctx);

async function loop() {
  await world.frame(async (execute) => {
    await execute(system1);
  });

  store.sync();

  await world.execute(system1); // , systemA, systemB);
  requestAnimationFrame(loop);
}

loop();
</script>
