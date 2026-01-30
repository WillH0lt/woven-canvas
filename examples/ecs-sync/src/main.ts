import "./style.css";
import * as THREE from "three";
import {
  World,
  addComponent,
  createEntity,
  removeEntity,
  hasComponent,
  removeComponent,
} from "@infinitecanvas/ecs";
import { EditorSync, Synced } from "@infinitecanvas/ecs-sync";

import * as comps from "./components";
import { renderSystem, type Resources } from "./systems";

// Setup Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.z = 10;
camera.position.y = 2;
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Add lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Add a ground plane for reference
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a2a4a,
  roughness: 0.8,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2;
scene.add(ground);

// Shared resources
const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const defaultMaterial = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  roughness: 0.3,
  metalness: 0.2,
});
const hoveredMaterial = new THREE.MeshStandardMaterial({
  color: 0x66aaff,
  roughness: 0.3,
  metalness: 0.2,
  emissive: 0x112244,
});
const selectedMaterial = new THREE.MeshStandardMaterial({
  color: 0xff8844,
  roughness: 0.3,
  metalness: 0.2,
  emissive: 0x442200,
});

const meshes = new Map<number, THREE.Mesh>();

// Create the ECS world
const world = new World(
  [
    comps.Sphere,
    comps.Hovered,
    comps.Selected,
    comps.Dragging,
    comps.Mouse,
    comps.Time,
    Synced,
  ],
  {
    maxEntities: 1000,
    resources: {
      scene,
      camera,
      meshes,
      sphereGeometry,
      defaultMaterial,
      hoveredMaterial,
      selectedMaterial,
    } satisfies Resources,
  },
);

// Read offline preference from localStorage
const OFFLINE_KEY = "ecs-sync-offline";
let isOffline = localStorage.getItem(OFFLINE_KEY) === "true";

// Initialize the synchronizer with transport
const editorSync = new EditorSync({
  documentId: "ecs-sync-demo",
  components: [comps.Sphere],
  usePersistence: true,
  useHistory: true,
  websocket: {
    url: "ws://localhost:8087/ws",
    clientId: crypto.randomUUID(),
    startOffline: isOffline,
  },
});

await editorSync.initialize();

// Raycasting for mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const intersection = new THREE.Vector3();

let draggedEntity: number | null = null;
let dragOffset = new THREE.Vector3();
let dragStartPos = new THREE.Vector2();

// Get 3D position from mouse on drag plane
function getMousePosition3D(clientX: number, clientY: number): THREE.Vector3 {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(dragPlane, intersection);
  return intersection.clone();
}

// Find entity under mouse
function getEntityUnderMouse(clientX: number, clientY: number): number | null {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const meshArray = Array.from(meshes.values());
  const intersects = raycaster.intersectObjects(meshArray);

  if (intersects.length > 0) {
    return intersects[0].object.userData.entityId as number;
  }
  return null;
}

// Mouse move - update hover state
document.addEventListener("mousemove", (e) => {
  const pos = getMousePosition3D(e.clientX, e.clientY);

  world.nextSync((ctx) => {
    const mouseState = comps.Mouse.write(ctx);
    mouseState.x = pos.x;
    mouseState.y = pos.z; // Use z for the ground plane

    // Handle dragging
    if (
      draggedEntity !== null &&
      hasComponent(ctx, draggedEntity, comps.Sphere, false)
    ) {
      const sphere = comps.Sphere.write(ctx, draggedEntity);
      sphere.x = pos.x - dragOffset.x;
      sphere.z = pos.z - dragOffset.z;
    }

    // Update hover state
    const hoveredEid = getEntityUnderMouse(e.clientX, e.clientY);

    // Clear previous hover
    for (const [eid] of meshes) {
      if (hasComponent(ctx, eid, comps.Hovered, false) && eid !== hoveredEid) {
        removeComponent(ctx, eid, comps.Hovered);
      }
    }

    // Set new hover
    if (
      hoveredEid !== null &&
      !hasComponent(ctx, hoveredEid, comps.Hovered, false)
    ) {
      addComponent(ctx, hoveredEid, comps.Hovered);
    }
  });
});

// Mouse down - start drag or select
document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return; // Left click only

  dragStartPos.set(e.clientX, e.clientY);

  const hoveredEid = getEntityUnderMouse(e.clientX, e.clientY);

  if (hoveredEid !== null) {
    // Start dragging existing sphere
    world.nextSync((ctx) => {
      if (!hasComponent(ctx, hoveredEid, comps.Sphere)) return;
      if (hasComponent(ctx, hoveredEid, comps.Dragging)) return;

      const sphere = comps.Sphere.read(ctx, hoveredEid);
      const mousePos = getMousePosition3D(e.clientX, e.clientY);

      dragOffset.set(mousePos.x - sphere.x, 0, mousePos.z - sphere.z);
      draggedEntity = hoveredEid;
      addComponent(ctx, hoveredEid, comps.Dragging);

      // Update drag plane height to sphere's y position
      dragPlane.constant = -sphere.y;
    });
  }
});

// Mouse up - stop dragging or change color on click
document.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return;

  const wasClick =
    Math.abs(e.clientX - dragStartPos.x) < 3 &&
    Math.abs(e.clientY - dragStartPos.y) < 3;

  if (draggedEntity !== null) {
    const clickedEntity = draggedEntity;
    world.nextSync((ctx) => {
      if (hasComponent(ctx, clickedEntity, comps.Dragging, false)) {
        removeComponent(ctx, clickedEntity, comps.Dragging);
      }

      // If it was a click (not a drag), change color
      if (wasClick && hasComponent(ctx, clickedEntity, comps.Sphere, false)) {
        const sphere = comps.Sphere.write(ctx, clickedEntity);
        sphere.color = Math.random() * 0xffffff;
      }
    });
    draggedEntity = null;
  }

  // Reset drag plane
  dragPlane.constant = 0;
});

// Right click - delete sphere
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();

  const hoveredEid = getEntityUnderMouse(e.clientX, e.clientY);

  if (hoveredEid !== null) {
    world.nextSync((ctx) => {
      if (!hasComponent(ctx, hoveredEid, Synced, false)) return;

      const synced = Synced.read(ctx, hoveredEid);
      removeEntity(ctx, hoveredEid);
    });
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
    editorSync.undo();
    e.preventDefault();
  } else if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
    editorSync.redo();
    e.preventDefault();
  } else if (e.key === "x" && !e.ctrlKey && !e.metaKey) {
    // Create a new sphere at origin
    world.nextSync((ctx) => {
      const eid = createEntity(ctx);
      const stableId = crypto.randomUUID();

      addComponent(ctx, eid, Synced, { id: stableId });

      addComponent(ctx, eid, comps.Sphere, {
        x: 0,
        y: 0,
        z: 0,
        radius: 0.3 + Math.random() * 0.3,
        color: Math.random() * 0xffffff,
      });
    });
  }
});

// Window resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add instructions overlay
const instructions = document.createElement("div");
instructions.style.cssText = `
  position: fixed;
  top: 10px;
  left: 10px;
  color: white;
  font-family: monospace;
  font-size: 14px;
  background: rgba(0,0,0,0.5);
  padding: 10px;
  border-radius: 5px;
`;
instructions.innerHTML = `
  <strong>ECS Sync Demo</strong><br>
  X: Create sphere at origin<br>
  Click sphere: Change color<br>
  Drag: Move sphere<br>
  Right-click: Delete sphere<br>
  Ctrl+Z: Undo<br>
  Ctrl+Shift+Z: Redo<br>
  <br>
  <em>Open in multiple tabs to see sync!</em>
`;
document.body.appendChild(instructions);

// Online/Offline toggle
const toggle = document.createElement("button");
toggle.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  font-family: monospace;
  font-size: 14px;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.2s;
`;

function updateToggle() {
  toggle.textContent = isOffline ? "Offline" : "Online";
  toggle.style.background = isOffline ? "#aa3333" : "#33aa55";
  toggle.style.color = "white";
}
updateToggle();

toggle.addEventListener("mousedown", async (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  isOffline = !isOffline;
  localStorage.setItem(OFFLINE_KEY, String(isOffline));
  updateToggle();

  if (isOffline) {
    editorSync.disconnect();
  } else {
    await editorSync.connect();
  }
});

document.body.appendChild(toggle);

// Main loop
let lastTime = performance.now();

async function animate() {
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  world.nextSync((ctx) => {
    const time = comps.Time.write(ctx);
    time.delta = deltaTime;
    time.current = currentTime / 1000;
  });

  world.sync();

  // Run synchronizer to process ECS events
  world.nextSync((ctx) => {
    editorSync.sync(ctx);
  });

  await world.execute(renderSystem);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
