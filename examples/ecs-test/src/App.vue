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
import { field, World } from "@infinitecanvas/ecs";
import { ref } from "vue";

import * as comps from "./components";

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

// Create world
const world = new World(comps);

// const Color = world.createComponent({
//   red: field.uint8(),
//   green: field.uint8(),
//   blue: field.uint8(),
// });

// const Block = world.createComponent({
//   width: field.float32(),
//   height: field.float32(),
// });

// Create some blocks
const block1 = world.createEntity();
world.addComponent(block1, comps.Velocity, { x: 50, y: 50 });
world.addComponent(block1, comps.Position, { x: 200, y: 200 });

// const block2 = world.createEntity();
// world.addComponent(block2, comps.Velocity, { x: 75, y: 75 });
// world.addComponent(block2, comps.Position, { x: 250, y: 250 });

async function loop() {
  await world.executeInParallel(
    new URL("./writerWorker.ts", import.meta.url).href
  );

  await world.executeInParallel(
    new URL("./readerWorker.ts", import.meta.url).href
  );

  requestAnimationFrame(loop);
}

loop();
</script>
