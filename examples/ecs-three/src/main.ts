import "./style.css";
import * as THREE from "three";
import Stats from "stats.js";
import {
  World,
  addComponent,
  createEntity,
  useQuery,
  type Context,
} from "@infinitecanvas/ecs";
import {
  Position,
  Velocity,
  Acceleration,
  Color,
  Size,
  Mouse,
  Lifetime,
  Attractor,
} from "./components";
import {
  physicsSystem,
  createRenderSystem,
  lifetimeSystem,
  createAttractorSystem,
} from "./systems";

// Configuration
const MAX_PARTICLES = 20_000;
const SPAWN_RATE = 2000; // particles per second

// Create the ECS world with all components
const world = new World(
  [Position, Velocity, Acceleration, Color, Size, Lifetime, Attractor, Mouse],
  {
    maxEntities: MAX_PARTICLES,
  }
);

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

// Create the systems
const renderSystem = createRenderSystem(instancedMesh, MAX_PARTICLES);
const attractorSystem = createAttractorSystem(camera);

// Mouse interaction
document.addEventListener("mousemove", (e) => {
  world.nextSync((ctx) => {
    const mouse = Mouse.write(ctx);

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

  addComponent(ctx, eid, Attractor);
  const attraction = Attractor.write(ctx, eid);
  attraction.strength = 500;
  attraction.targetX = 0;
  attraction.targetY = 0;
  attraction.targetZ = 0;

  console.log("ADDING ATTRACTOR", eid);
});

// Particle spawner
let particleSpawnAccumulator = 0;

function spawnParticles(ctx: Context, deltaTime: number) {
  particleSpawnAccumulator += deltaTime;
  const particlesToSpawn = Math.floor(particleSpawnAccumulator * SPAWN_RATE);
  particleSpawnAccumulator -= particlesToSpawn / SPAWN_RATE;

  for (let i = 0; i < particlesToSpawn; i++) {
    const eid = createEntity(ctx);

    // Random spawn position in a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 2 + Math.random() * 2;

    addComponent(ctx, eid, Position);
    const pos = Position.write(ctx, eid);
    pos.x = r * Math.sin(phi) * Math.cos(theta);
    pos.y = r * Math.sin(phi) * Math.sin(theta);
    pos.z = r * Math.cos(phi);

    addComponent(ctx, eid, Velocity);
    const vel = Velocity.write(ctx, eid);
    vel.x = (Math.random() - 0.5) * 2;
    vel.y = (Math.random() - 0.5) * 2;
    vel.z = (Math.random() - 0.5) * 2;

    addComponent(ctx, eid, Acceleration);
    const acc = Acceleration.write(ctx, eid);
    acc.x = 0;
    acc.y = -1; // Gravity
    acc.z = 0;

    // Random color with some bias toward blue/purple
    addComponent(ctx, eid, Color);
    const color = Color.write(ctx, eid);
    const hue = Math.random() * 0.3 + 0.5; // 0.5-0.8 range (cyan to purple)
    const c = new THREE.Color().setHSL(hue, 0.8, 0.6);
    color.r = c.r;
    color.g = c.g;
    color.b = c.b;

    addComponent(ctx, eid, Size);
    const size = Size.write(ctx, eid);
    size.value = 0.1 + Math.random() * 0.15;

    addComponent(ctx, eid, Lifetime);
    const lifetime = Lifetime.write(ctx, eid);
    lifetime.current = 0;
    lifetime.max = 3 + Math.random() * 4;
  }
}

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

async function animate() {
  stats.begin();
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Spawn new particles
  world.nextSync((ctx) => {
    spawnParticles(ctx, deltaTime);
  });

  // Sync and execute systems
  world.sync();
  await world.execute(
    lifetimeSystem,
    renderSystem,
    physicsSystem,
    attractorSystem
  );

  // Render the scene
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
  stats.end();
}

// Start animation loop
animate();
