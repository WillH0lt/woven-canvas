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
import { field, World, System } from "@infinitecanvas/ecs";
import { ref } from "vue";

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
const world = new World();

const Color = world.createComponent({
  red: field.uint8(),
  green: field.uint8(),
  blue: field.uint8(),
});

const Position = world.createComponent({
  x: field.float32(),
  y: field.float32(),
});

const Block = world.createComponent({
  id: field.uint32(),
  width: field.float32(),
  height: field.float32(),
});

class SyncSystem extends System {
  // Define a query for entities that can move
  private blocks = this.query((q) => q.with(Block, Position, Color));

  public execute(): void {
    for (const blockEntity of this.blocks.current) {
      const pos = blockEntity.get(Position)!;
      const color = blockEntity.get(Color)!;
      const block = blockEntity.get(Block)!;

      blocks.value[block.value.id] = {
        id: block.value.id,
        width: block.value.width,
        height: block.value.height,
        x: pos.value.x,
        y: pos.value.y,
        red: color.value.red,
        green: color.value.green,
        blue: color.value.blue,
      };
    }
  }
}

class MoveSystem extends System {
  // Define a query for entities that can move
  private movers = this.query((q) => q.withTracked(Position));

  public execute(): void {
    console.log(
      "CURRENT ENTITY",
      this.movers.current.length,
      "ADDED ENTITY",
      this.movers.added.length,
      "CHANGED ENTITY",
      this.movers.changed.length,
      "REMOVED ENTITY",
      this.movers.removed.length
    );

    for (const entity of this.movers.added) {
      // perform some initialization if needed
      const pos = entity.get(Position)!;
      pos.value.x += 10;
      pos.value.y += 10;
    }

    for (const entity of this.movers.current) {
      // move entities in a circular pattern
      const pos = entity.get(Position)!;
      const time = Date.now() * 0.001;
      pos.value.x += Math.cos(time) * 0.5;
      pos.value.y += Math.sin(time) * 0.5;
    }
  }
}

// Create systems
const syncSystem = world.createSystem(SyncSystem);
const moveSystem = world.createSystem(MoveSystem);

// Create some blocks
const block1 = world.createEntity();

block1.add(Block, { id: 1, width: 50, height: 50 });
block1.add(Position, { x: 200, y: 200 });
block1.add(Color, { red: 0, green: 255, blue: 0 });

const block2 = world.createEntity();
block2.add(Block, { id: 2, width: 75, height: 75 });
block2.add(Position, { x: 250, y: 250 });
block2.add(Color, { red: 255, green: 0, blue: 0 });

function loop() {
  requestAnimationFrame(loop);

  moveSystem.execute();
  syncSystem.execute();
}

loop();
</script>
