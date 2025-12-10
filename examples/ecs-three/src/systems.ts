import {
  defineSystem,
  defineWorkerSystem,
  useQuery,
  removeEntity,
} from "@infinitecanvas/ecs";
import * as THREE from "three";
import {
  Position,
  Color,
  Size,
  Lifetime,
  Mouse,
  Attractor,
} from "./components";

// Create the worker system for physics
export const physicsSystem = defineWorkerSystem(
  new URL("./physicsWorker.ts", import.meta.url).href,
  { threads: 8, priority: "high" }
);

// Query for renderable entities
const renderQuery = useQuery((q) => q.with(Position, Color, Size));

// Create the rendering system
export function createRenderSystem(
  instancedMesh: THREE.InstancedMesh,
  maxParticles: number
) {
  const tempMatrix = new THREE.Matrix4();
  const tempColor = new THREE.Color();

  return defineSystem((ctx) => {
    let index = 0;

    for (const eid of renderQuery.current(ctx)) {
      if (index >= maxParticles) break;

      const pos = Position.read(ctx, eid);
      const color = Color.read(ctx, eid);
      const size = Size.read(ctx, eid);

      // Update matrix for this instance
      tempMatrix.makeScale(size.value, size.value, size.value);
      tempMatrix.setPosition(pos.x, pos.y, pos.z);
      instancedMesh.setMatrixAt(index, tempMatrix);

      // Update color for this instance
      tempColor.setRGB(color.r, color.g, color.b);
      instancedMesh.setColorAt(index, tempColor);

      index++;
    }

    // Hide unused instances by scaling them to 0
    for (let i = index; i < maxParticles; i++) {
      tempMatrix.makeScale(0, 0, 0);
      instancedMesh.setMatrixAt(i, tempMatrix);
    }

    // Mark for update
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
  });
}

// Lifetime management system
const lifetimeQuery = useQuery((q) => q.with(Lifetime));

export const lifetimeSystem = defineSystem((ctx) => {
  for (const eid of lifetimeQuery.current(ctx)) {
    const lifetime = Lifetime.read(ctx, eid);

    if (lifetime.current >= lifetime.max) {
      removeEntity(ctx, eid);
    }
  }
});

export function createAttractorSystem(camera: THREE.Camera) {
  const mouseQuery = useQuery((q) => q.tracking(Mouse));
  const attractors = useQuery((q) => q.with(Attractor));
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersection = new THREE.Vector3();

  return defineSystem((ctx) => {
    if (mouseQuery.changed(ctx).length > 0) {
      const mouse = Mouse.read(ctx);

      raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
      raycaster.ray.intersectPlane(plane, intersection);

      console.log("FOUND ", attractors.current(ctx).length, " attractors");
      for (const eid of attractors.current(ctx)) {
        const attractor = Attractor.write(ctx, eid);
        attractor.targetX = intersection.x;
        attractor.targetY = intersection.y;
        attractor.targetZ = 0;
      }
    }
  });
}
