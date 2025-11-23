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
  width: field.float32(),
  height: field.float32(),
});

class SyncSystem extends System {
  // Define a query for entities that can move
  private blocks = this.query((q) => q.with(Block, Position, Color));

  public execute(): void {
    for (const eid of this.blocks.current) {
      blocks.value[eid] = {
        id: eid,
        width: Block.buffer.width[eid],
        height: Block.buffer.height[eid],
        x: Position.buffer.x[eid],
        y: Position.buffer.y[eid],
        red: Color.buffer.red[eid],
        green: Color.buffer.green[eid],
        blue: Color.buffer.blue[eid],
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

    // for (const eid of this.movers.added) {
    //   // perform some initialization if needed
    //   // const pos = this.read(eid, Position)
    //   const pos = Position.read(eid);

    //   // pos.x
    //   // const pos = entity.get(Position)!;
    //   pos.x += 10;
    //   pos.y += 10;
    // }

    for (const eid of this.movers.current) {
      // move entities in a circular pattern
      const pos = Position.read(eid);
      const time = Date.now() * 0.001;
      Position.buffer.x[eid] += Math.cos(time) * 0.5;
      Position.buffer.y[eid] += Math.sin(time) * 0.5;
    }
  }
}

// Create systems
const syncSystem = world.createSystem(SyncSystem);
const moveSystem = world.createSystem(MoveSystem);

// Create some blocks
const block1 = world.createEntity();
world.addComponent(block1, Block, { width: 50, height: 50 });
world.addComponent(block1, Position, { x: 200, y: 200 });
world.addComponent(block1, Color, { red: 0, green: 255, blue: 0 });

const block2 = world.createEntity();
world.addComponent(block2, Block, { width: 75, height: 75 });
world.addComponent(block2, Position, { x: 250, y: 250 });
world.addComponent(block2, Color, { red: 255, green: 0, blue: 0 });

function loop() {
  requestAnimationFrame(loop);

  world.execute(moveSystem);
  world.execute(syncSystem);
}

loop();
</script>
