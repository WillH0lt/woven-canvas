<template>
  <div
    v-for="block in blocks"
    :key="block.id"
    :style="{
      position: 'absolute',
      width: block.width + 'px',
      height: block.height + 'px',
      left: block.x + 'px',
      top: block.y + 'px',
      backgroundColor: `rgb(${block.red}, ${block.green}, ${block.blue})`,
    }"
  ></div>
</template>

<script setup lang="ts">
import {
  useQuery,
  defineSystem,
  defineWorkerSystem,
  createEntity,
  addComponent,
  World,
  useSingleton,
  type Context,
} from "@infinitecanvas/ecs";
import { ref } from "vue";

import * as components from "./components";

interface BlockEntity {
  id: number;
  width: number;
  height: number;
  x: number;
  y: number;
  red: number;
  green: number;
  blue: number;
}

const blocks = ref<Record<string, BlockEntity>>({});

const world = new World(Object.values(components));
const ctx = world.getContext();

// Create some blocks
const block1 = createEntity(ctx);
addComponent(ctx, block1, components.Velocity, { x: 50, y: 50 });
addComponent(ctx, block1, components.Position, { x: 200, y: 200 });

const query = useQuery((q) => q.with(components.Position, components.Velocity));

const MouseRef = useSingleton(components.Mouse);

// Define main thread systems
const system1 = defineSystem((ctx: Context) => {
  console.log("executing");

  const mouse = MouseRef.write();
  mouse.x += 1;
  mouse.y += 1;
});

// Define worker system
const system3 = defineWorkerSystem(
  new URL("./readerWorker.ts", import.meta.url).href
);

let frameCount = 0;
async function loop() {
  // Execute all systems - main thread systems run in order,
  // worker systems run in parallel
  await world.execute(system1, system3);

  frameCount++;
  if (frameCount < 10) {
    requestAnimationFrame(loop);
  } else {
    console.log("Completed 10 frames");
  }
}

loop();
</script>
