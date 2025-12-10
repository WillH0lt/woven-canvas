import "./style.css";
import * as THREE from "three";
import Stats from "stats.js";
import { World, addComponent, createEntity } from "@infinitecanvas/ecs";
import * as comps from "./components";
import {
  physicsSystem,
  renderSystem,
  lifetimeSystem,
  attractorSystem,
  spawnerSystem,
} from "./systems";

// Configuration
const MAX_PARTICLES = 20_000;
const SPAWN_RATE = 1000; // particles per second

// Setup Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 15;
camera.position.y = 5;
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Create instanced mesh for efficient particle rendering
const geometry = new THREE.SphereGeometry(1, 8, 8);
const material = new THREE.MeshBasicMaterial();
const instancedMesh = new THREE.InstancedMesh(
  geometry,
  material,
  MAX_PARTICLES
);

// Initialize instance colors array
instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
  new Float32Array(MAX_PARTICLES * 3),
  3
);

scene.add(instancedMesh);

// Create the ECS world with all components and resources
const world = new World(Array.from(Object.values(comps)), {
  maxEntities: MAX_PARTICLES,
  resources: {
    instancedMesh,
    camera,
    maxParticles: MAX_PARTICLES,
    spawnRate: SPAWN_RATE,
  },
});

// Mouse interaction
document.addEventListener("mousemove", (e) => {
  world.nextSync((ctx) => {
    const mouse = comps.Mouse.write(ctx);

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
});

// Window resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize attractors
world.nextSync((ctx) => {
  const eid = createEntity(ctx);

  addComponent(ctx, eid, comps.Attractor);
  const attraction = comps.Attractor.write(ctx, eid);
  attraction.strength = 500;
  attraction.targetX = 0;
  attraction.targetY = 0;
  attraction.targetZ = 0;
});

// Instructions
const instructionsDiv = document.createElement("div");
instructionsDiv.style.position = "absolute";
instructionsDiv.style.bottom = "10px";
instructionsDiv.style.left = "10px";
instructionsDiv.style.color = "white";
instructionsDiv.style.fontFamily = "monospace";
instructionsDiv.style.fontSize = "14px";
instructionsDiv.style.background = "rgba(0,0,0,0.5)";
instructionsDiv.style.padding = "10px";
instructionsDiv.style.borderRadius = "5px";
instructionsDiv.style.userSelect = "none";
instructionsDiv.innerHTML = `
  <strong>ECS + Three.js + Workers Demo</strong><br>
  <em>Click and hold</em> to attract particles to cursor<br>
`;
document.body.appendChild(instructionsDiv);

// Main loop
let lastTime = performance.now();
const stats = new Stats();
document.body.appendChild(stats.dom);

// Visibility change handling - pause when tab is hidden
let isPaused = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    isPaused = true;
  } else {
    isPaused = false;
    lastTime = performance.now();
  }
});

async function animate() {
  if (isPaused) {
    requestAnimationFrame(animate);
    return;
  }

  stats.begin();
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  world.nextSync((ctx) => {
    const time = comps.Time.write(ctx);
    time.delta = deltaTime;
  });

  world.sync();
  await world.execute(
    spawnerSystem,
    lifetimeSystem,
    renderSystem,
    physicsSystem,
    attractorSystem
  );

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
  stats.end();
}

animate();
