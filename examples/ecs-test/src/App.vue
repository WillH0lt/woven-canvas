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
  type Context,
  defineSystem,
  createEntity,
  addComponent,
  World,
  defineQuery,
  field,
  defineComponent,
  defineSingleton,
} from "@infinitecanvas/ecs";
import { reactive } from "vue";

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

const Mouse = defineSingleton({
  x: field.float32().default(0),
  y: field.float32().default(0),
});

const world = new World([Velocity, Position, Size, Color, Mouse], {
  threads: 4,
});

world.nextSync((ctx) => {
  // Create some blocks
  for (let i = 0; i < 15; i++) {
    const block1 = createEntity(ctx);

    addComponent(ctx, block1, Velocity, {
      x: Math.random() * 2,
      y: Math.random() * 2,
    });
    addComponent(ctx, block1, Position, {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
    });
    addComponent(ctx, block1, Size, {
      width: Math.random() * 100 + 25,
      height: Math.random() * 100 + 25,
    });
    addComponent(ctx, block1, Color, {
      red: Math.random() * 255,
      green: Math.random() * 255,
      blue: Math.random() * 255,
    });
  }
});

window.addEventListener("mousemove", (event) => {
  world.nextSync((ctx) => {
    // Use Mouse.write(ctx) directly - no need for useSingleton!
    const mouse = Mouse.write(ctx);
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
});

async function changeColor(entityId: number) {
  world.nextSync((ctx) => {
    const color = Color.write(ctx, entityId);

    // Use Mouse.read(ctx) directly - clean singleton API!
    const mousePos = Mouse.read(ctx);
    console.log("Clicked at mouse position:", mousePos.x, mousePos.y);

    color.red = Math.floor(Math.random() * 256);
    color.green = Math.floor(Math.random() * 256);
    color.blue = Math.floor(Math.random() * 256);
  });
}

const blocks = defineQuery((q) => q.tracking(Position, Size, Color));
// Track mouse changes using a query - demonstrates singleton query support!
const mouseQuery = defineQuery((q) => q.tracking(Mouse));

const system1 = defineSystem((ctx: Context) => {
  // Check if mouse changed this frame using the query
  const hasMouseChanged = mouseQuery.changed(ctx).length > 0;
  if (hasMouseChanged) {
    const mouse = Mouse.read(ctx);
    // Mouse moved! Could use this to highlight blocks under cursor, etc.
    // console.log(`Mouse position: ${mouse.x}, ${mouse.y}`);
  }

  for (const eid of blocks.current(ctx)) {
    const pos = Position.write(ctx, eid);
    const vel = Velocity.write(ctx, eid);
    const size = Size.read(ctx, eid);

    pos.x += vel.x;
    pos.y += vel.y;

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

const state = reactive<Record<number, any>>({});
world.subscribe(blocks, (ctx, { added, removed, changed }) => {
  for (const entityId of added) {
    state[entityId] = {};
    state[entityId].Position = Position.snapshot(ctx, entityId);
    state[entityId].Size = Size.snapshot(ctx, entityId);
    state[entityId].Color = Color.snapshot(ctx, entityId);
  }

  for (const entityId of removed) {
    delete state[entityId];
  }

  for (const entityId of changed) {
    if (state[entityId]) {
      state[entityId].Position = Position.snapshot(ctx, entityId);
      state[entityId].Size = Size.snapshot(ctx, entityId);
      state[entityId].Color = Color.snapshot(ctx, entityId);
    }
  }
});

// Subscribe to mouse changes using the new SingletonDef API
const query = defineQuery((q) => q.tracking(Mouse));
world.subscribe(query, (ctx) => {
  const mouse = Mouse.read(ctx);
  console.log("Mouse moved:", mouse.x, mouse.y);
});

async function loop() {
  requestAnimationFrame(loop);

  world.sync();

  await world.execute(system1);
}

loop();
</script>
