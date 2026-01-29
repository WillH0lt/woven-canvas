import {
  defineSystem,
  defineQuery,
  getResources,
  hasComponent,
} from "@infinitecanvas/ecs";
import * as THREE from "three";
import { Sphere, Hovered, Selected, Dragging, Synced } from "./components";

export interface Resources {
  scene: THREE.Scene;
  camera: THREE.Camera;
  meshes: Map<number, THREE.Mesh>;
  sphereGeometry: THREE.SphereGeometry;
  defaultMaterial: THREE.MeshStandardMaterial;
  hoveredMaterial: THREE.MeshStandardMaterial;
  selectedMaterial: THREE.MeshStandardMaterial;
}

// Query for all spheres
const sphereQuery = defineQuery((q) => q.with(Sphere, Synced));

// Render system - sync Three.js meshes with ECS entities
export const renderSystem = defineSystem((ctx) => {
  const resources = getResources<Resources>(ctx);
  const { scene, meshes, sphereGeometry, defaultMaterial, hoveredMaterial, selectedMaterial } = resources;

  const currentEntities = new Set<number>();

  for (const eid of sphereQuery.current(ctx)) {
    currentEntities.add(eid);
    const sphere = Sphere.read(ctx, eid);

    let mesh = meshes.get(eid);

    // Create mesh if it doesn't exist
    if (!mesh) {
      mesh = new THREE.Mesh(sphereGeometry, defaultMaterial.clone());
      mesh.userData.entityId = eid;
      meshes.set(eid, mesh);
      scene.add(mesh);
    }

    // Update position
    mesh.position.set(sphere.x, sphere.y, sphere.z);
    mesh.scale.setScalar(sphere.radius * 2);

    // Update material based on state
    const isHovered = hasComponent(ctx, eid, Hovered, false);
    const isSelected = hasComponent(ctx, eid, Selected, false);
    const isDragging = hasComponent(ctx, eid, Dragging, false);

    if (isDragging || isSelected) {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(0xff8844);
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x442200);
    } else if (isHovered) {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(0x66aaff);
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x112244);
    } else {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(sphere.color);
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
    }
  }

  // Remove meshes for deleted entities
  for (const [eid, mesh] of meshes) {
    if (!currentEntities.has(eid)) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      meshes.delete(eid);
    }
  }
});
