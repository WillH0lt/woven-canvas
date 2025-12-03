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
  defineSystem,
  defineWorkerSystem,
  World,
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

const world = new World(components);

// Create some blocks
const block1 = world.createEntity();
world.addComponent(block1, components.Velocity, { x: 50, y: 50 });
world.addComponent(block1, components.Position, { x: 200, y: 200 });

// Define main thread systems
const system1 = defineSystem((ctx: Context) => {
  console.log("System 1 running on main thread");
});

const system2 = defineSystem((ctx: Context) => {
  console.log("System 2 running on main thread");
});

// Define worker system
const system3 = defineWorkerSystem(
  new URL("./readerWorker.ts", import.meta.url).href
);

let frameCount = 0;
async function loop() {
  // Execute all systems - main thread systems run in order,
  // worker systems run in parallel
  await world.execute(system1, system2, system3);

  frameCount++;
  if (frameCount < 10) {
    requestAnimationFrame(loop);
  } else {
    console.log("Completed 10 frames");
  }
}

loop();
</script>
