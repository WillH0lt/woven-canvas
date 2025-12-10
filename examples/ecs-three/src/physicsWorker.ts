import { setupWorker, useQuery } from "@infinitecanvas/ecs";
import {
  Position,
  Velocity,
  Acceleration,
  Attractor,
  Lifetime,
} from "./components";

// Define queries
const particles = useQuery((q) =>
  q.with(Position, Velocity, Acceleration, Lifetime)
);

const attractorQuery = useQuery((q) => q.with(Attractor));

// Setup the worker with physics simulation logic

let prev = performance.now();
setupWorker((ctx) => {
  const dt = (performance.now() - prev) / 1000;
  prev = performance.now();

  // Apply acceleration to velocity
  for (const eid of particles.current(ctx, { partitioned: true })) {
    const vel = Velocity.write(ctx, eid);
    const acc = Acceleration.read(ctx, eid);

    vel.x += acc.x * dt;
    vel.y += acc.y * dt;
    vel.z += acc.z * dt;

    // Apply damping
    const damping = 0.98;
    vel.x *= damping;
    vel.y *= damping;
    vel.z *= damping;
  }

  // Apply attraction forces
  for (const eid of attractorQuery.current(ctx)) {
    const attractor = Attractor.read(ctx, eid);

    for (const mid of particles.current(ctx, { partitioned: true })) {
      const pos = Position.read(ctx, mid);
      const vel = Velocity.write(ctx, mid);

      // Calculate direction to target
      const dx = attractor.targetX - pos.x;
      const dy = attractor.targetY - pos.y;
      const dz = attractor.targetZ - pos.z;

      // Calculate distance
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq);

      // Avoid division by zero and too strong forces at close range
      if (dist > 0.1) {
        // Normalize direction and apply force
        const force = attractor.strength / (distSq + 1);
        vel.x += (dx / dist) * force * dt;
        vel.y += (dy / dist) * force * dt;
        vel.z += (dz / dist) * force * dt;
      }
    }
  }

  // Apply velocity to position
  for (const eid of particles.current(ctx, { partitioned: true })) {
    const pos = Position.write(ctx, eid);
    const vel = Velocity.read(ctx, eid);

    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    pos.z += vel.z * dt;
  }

  // Update lifetimes
  for (const eid of particles.current(ctx, { partitioned: true })) {
    const lifetime = Lifetime.write(ctx, eid);
    lifetime.current += dt;
  }
});
